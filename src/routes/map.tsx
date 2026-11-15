import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MicIcon, SearchIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "#/components/app-shell";
import { DecadeDial } from "#/components/decade-dial";
import { StorySheetContent } from "#/components/explore/story-sheet";
import { useIsDesktop } from "#/components/explore/use-is-desktop";
import { StoryMap } from "#/components/story-map";
import { Button } from "#/components/ui/button";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerTitle,
} from "#/components/ui/drawer";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { clampDecade, decadeColor, decadeLabel } from "#/lib/decades";
import {
	decadeCountsQuery,
	type MapScope,
	mapStoriesQuery,
	meQuery,
} from "#/lib/queries";
import { cn } from "#/lib/utils";
import type { StoryPin } from "#/server/fns/stories";

type MapSearch = { decade?: number; story?: string; scope?: MapScope };
const SCOPES = ["everything", "mine", "family", "public"] as const;

export const Route = createFileRoute("/map")({
	validateSearch: (s: Record<string, unknown>): MapSearch => {
		const decade = Number(s.decade);
		return {
			decade:
				Number.isFinite(decade) && s.decade != null && s.decade !== ""
					? clampDecade(decade)
					: undefined,
			story: typeof s.story === "string" && s.story ? s.story : undefined,
			scope:
				SCOPES.includes(s.scope as MapScope) && s.scope !== "everything"
					? (s.scope as MapScope)
					: undefined,
		};
	},
	loader: async ({ context }) => {
		try {
			await Promise.all([
				context.queryClient.ensureQueryData(mapStoriesQuery("everything")),
				context.queryClient.ensureQueryData(decadeCountsQuery),
			]);
		} catch {
			// the map still works without prefetched data
		}
	},
	component: MapPage,
});

const SCOPE_LABEL: Record<string, string> = {
	everything: "Everything",
	mine: "Mine",
	family: "Family",
};

function MapPage() {
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const isDesktop = useIsDesktop();
	const { data: me } = useQuery(meQuery);
	const scope: MapScope = me ? (search.scope ?? "everything") : "everything";
	const { data: pins = [], isPending } = useQuery(mapStoriesQuery(scope));
	const { data: counts = {} } = useQuery(decadeCountsQuery);
	const decade = search.decade ?? null;
	const selectedId = search.story ?? null;
	const [flyTo, setFlyTo] = useState<{
		lat: number;
		lng: number;
		zoom?: number;
	} | null>(null);
	const flownTo = useRef<string | null>(null);

	const update = (patch: Partial<MapSearch>) =>
		navigate({
			search: (prev: MapSearch) => ({ ...prev, ...patch }),
			replace: true,
		});

	const mapPins = useMemo(
		() =>
			pins.map((p) => ({
				id: p.id,
				lat: p.lat,
				lng: p.lng,
				decade: p.decade,
				title: p.title,
				hasAudio: p.hasAudio,
				placeLabel: p.placeLabel,
				storytellerName: p.storytellerName,
				durationMs: p.durationMs,
				year: p.year,
			})),
		[pins],
	);

	// fly to a story that arrived through the URL, once its pin is known
	useEffect(() => {
		if (!selectedId || flownTo.current === selectedId) return;
		const p = pins.find((x) => x.id === selectedId);
		if (p) {
			flownTo.current = selectedId;
			setFlyTo({ lat: p.lat, lng: p.lng });
		}
	}, [selectedId, pins]);

	const select = (id: string | null, fly?: { lat: number; lng: number }) => {
		if (id) flownTo.current = id;
		if (fly) setFlyTo({ ...fly });
		update({ story: id ?? undefined });
	};

	const inDecade =
		decade == null
			? pins.length
			: pins.filter((p) => clampDecade(p.decade) === decade).length;
	const sheetOpen = !!selectedId;
	const empty = !isPending && pins.length === 0 && scope === "everything";

	return (
		<AppShell bleed>
			<StoryMap
				className="absolute inset-0"
				bottomInset={isDesktop ? 0 : 118}
				pins={mapPins}
				activeDecade={decade}
				selectedId={selectedId}
				onSelect={(id) => {
					const p = id ? pins.find((x) => x.id === id) : null;
					select(id, p ?? undefined);
				}}
				fitPins
				flyTo={flyTo}
			/>

			{/* top toolbar: search on the left, filters and the main action on the right */}
			<div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-wrap items-start gap-2 sm:inset-x-4 sm:top-4 [&>*]:pointer-events-auto">
				<MapSearch
					pins={pins}
					onPick={(p) => select(p.id, p)}
					className="w-full sm:w-[22rem]"
				/>
				<div className="ml-auto flex items-center gap-2">
					{me && (
						<ToggleGroup
							type="single"
							value={scope}
							onValueChange={(v) =>
								v &&
								update({
									scope: v === "everything" ? undefined : (v as MapScope),
								})
							}
							aria-label="Whose memories to show"
							className="panel-float h-11 gap-0.5 rounded-xl! p-1"
						>
							{(["everything", "mine", "family"] as const).map((s) => (
								<ToggleGroupItem
									key={s}
									value={s}
									className="h-9 rounded-lg! px-3 text-[0.8125rem] font-medium text-text-soft hover:bg-raised hover:text-text data-[state=on]:bg-raised-2 data-[state=on]:text-text"
								>
									{SCOPE_LABEL[s]}
								</ToggleGroupItem>
							))}
						</ToggleGroup>
					)}
					<div className="panel-float hidden h-11 items-center rounded-xl! p-1 lg:flex">
						<Button asChild variant="gold-soft" size="sm" className="h-9">
							<Link to="/record">
								<MicIcon />
								Record a memory
							</Link>
						</Button>
					</div>
				</div>
			</div>

			{empty && (
				<div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4 pb-40">
					<div className="panel-float pointer-events-auto max-w-sm p-6">
						<p className="text-xl font-semibold tracking-tight">
							No memories here yet
						</p>
						<p className="mt-2 text-sm leading-relaxed text-text-soft">
							Sit down with someone who remembers this street and press record.
							Their voice will be pinned right here.
						</p>
						<Button asChild variant="gold" className="mt-4">
							<Link to="/record">
								<MicIcon />
								Record a memory
							</Link>
						</Button>
					</div>
				</div>
			)}

			{/* desktop story panel: floats over the map so the map stays interactive */}
			{isDesktop && sheetOpen && (
				<aside
					aria-label="Story"
					className="panel-float absolute top-[4.75rem] right-4 bottom-4 z-20 w-[25rem] overflow-y-auto animate-in slide-in-from-right-8 fade-in-0 duration-200"
				>
					<StorySheetContent
						id={selectedId}
						showClose
						onClose={() => select(null)}
						onSelect={(c) => select(c.id, c)}
					/>
				</aside>
			)}

			{/* mobile story drawer */}
			{!isDesktop && (
				<Drawer open={sheetOpen} onOpenChange={(o) => !o && select(null)}>
					<DrawerContent className="max-h-[85dvh] bg-panel">
						<DrawerTitle className="sr-only">Story</DrawerTitle>
						<DrawerDescription className="sr-only">
							A memory pinned on the map
						</DrawerDescription>
						<div className="overflow-y-auto">
							{selectedId && (
								<StorySheetContent
									id={selectedId}
									onClose={() => select(null)}
									onSelect={(c) => select(c.id, c)}
								/>
							)}
						</div>
					</DrawerContent>
				</Drawer>
			)}

			{/* the decade scrubber, docked bottom-left */}
			<div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 sm:inset-x-auto sm:bottom-4 sm:left-4 sm:w-[26rem]">
				<div className="pointer-events-auto">
					<DecadeDial
						value={decade}
						onChange={(d) => update({ decade: d ?? undefined })}
						counts={counts}
						compact={!isDesktop}
					/>
				</div>
				{decade != null && inDecade === 0 && !isPending && (
					<p className="panel-float pointer-events-auto mt-2 px-4 py-2.5 text-[0.8125rem] text-text-soft">
						Nobody has recorded the {decadeLabel(decade)} here yet.{" "}
						<Link
							to="/record"
							className="font-medium text-gold hover:underline"
						>
							Record one
						</Link>
					</p>
				)}
			</div>
		</AppShell>
	);
}

/** Search bar: finds memories by title, place or storyteller among the pins on the map. */
function MapSearch({
	pins,
	onPick,
	className,
}: {
	pins: StoryPin[];
	onPick: (p: StoryPin) => void;
	className?: string;
}) {
	const [q, setQ] = useState("");
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);
	const input = useRef<HTMLInputElement>(null);
	const results = useMemo(() => {
		const t = q.trim().toLowerCase();
		if (!t) return [];
		return pins
			.filter((p) =>
				`${p.title} ${p.placeLabel} ${p.storytellerName}`
					.toLowerCase()
					.includes(t),
			)
			.slice(0, 6);
	}, [q, pins]);

	// "/" focuses the search, like most map tools
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const tag = (e.target as HTMLElement | null)?.tagName;
			if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
				e.preventDefault();
				input.current?.focus();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	const pick = (p: StoryPin) => {
		onPick(p);
		setQ("");
		setOpen(false);
		input.current?.blur();
	};

	return (
		<div className={cn("relative", className)}>
			<label className="panel-float flex h-11 items-center gap-2.5 rounded-xl! px-3.5">
				<SearchIcon className="size-4 shrink-0 text-text-faint" />
				<input
					ref={input}
					value={q}
					onChange={(e) => {
						setQ(e.target.value);
						setActive(0);
						setOpen(true);
					}}
					onFocus={() => setOpen(true)}
					onBlur={() => setTimeout(() => setOpen(false), 120)}
					onKeyDown={(e) => {
						if (e.key === "ArrowDown") {
							e.preventDefault();
							setActive((a) => Math.min(results.length - 1, a + 1));
						} else if (e.key === "ArrowUp") {
							e.preventDefault();
							setActive((a) => Math.max(0, a - 1));
						} else if (e.key === "Enter" && results[active])
							pick(results[active]);
						else if (e.key === "Escape") input.current?.blur();
					}}
					placeholder="Search a street, a story or a name"
					aria-label="Search memories"
					className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-faint"
				/>
				<span className="kbd hidden sm:inline-flex">/</span>
			</label>
			{open && q.trim() && (
				<div className="panel-float absolute inset-x-0 top-full mt-2 overflow-hidden p-1.5">
					{results.length === 0 ? (
						<p className="px-3 py-2.5 text-[0.8125rem] text-text-soft">
							No memory mentions “{q.trim()}” yet.
						</p>
					) : (
						<ul>
							{results.map((p, i) => (
								<li key={p.id}>
									<button
										type="button"
										onMouseDown={(e) => e.preventDefault()}
										onClick={() => pick(p)}
										onMouseEnter={() => setActive(i)}
										className={cn(
											"flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left",
											i === active && "bg-raised",
										)}
									>
										<span
											className="size-2 shrink-0 rounded-full"
											style={{ background: decadeColor(p.decade) }}
										/>
										<span className="min-w-0 flex-1">
											<span className="block truncate text-sm text-text">
												{p.title}
											</span>
											<span className="block truncate text-xs text-text-faint">
												{p.placeLabel} · {p.storytellerName}
											</span>
										</span>
										<span className="numerals text-xs text-text-faint">
											{p.year ?? decadeLabel(p.decade)}
										</span>
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			)}
		</div>
	);
}
