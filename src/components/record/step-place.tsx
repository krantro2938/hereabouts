import { useQuery } from "@tanstack/react-query";
import { MapPinIcon, SearchIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DecadeDial } from "#/components/decade-dial";
import { DEFAULT_CENTER, StoryMap } from "#/components/story-map";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { decadeLabel } from "#/lib/decades";
import { decadeCountsQuery } from "#/lib/queries";
import { cn } from "#/lib/utils";
import { findPlaces, placeName } from "#/server/fns/record";
import type { Draft } from "./state";

type Hit = { label: string; lat: number; lng: number };

export function StepPlace({
	draft,
	patch,
	onBack,
	onNext,
}: {
	draft: Draft;
	patch: (p: Partial<Draft>) => void;
	onBack: () => void;
	onNext: () => void;
}) {
	const { data: counts } = useQuery(decadeCountsQuery);
	const [query, setQuery] = useState("");
	const [hits, setHits] = useState<Hit[]>([]);
	const [searching, setSearching] = useState(false);
	const [flyTo, setFlyTo] = useState<{
		lat: number;
		lng: number;
		zoom?: number;
	} | null>(
		draft.lat != null && draft.lng != null
			? { lat: draft.lat, lng: draft.lng, zoom: 15 }
			: null,
	);
	const geoSeq = useRef(0);

	useEffect(() => {
		const q = query.trim();
		if (q.length < 3) {
			setHits([]);
			return;
		}
		setSearching(true);
		const t = setTimeout(() => {
			findPlaces({
				data: {
					q,
					near:
						draft.lat != null && draft.lng != null
							? { lat: draft.lat, lng: draft.lng }
							: undefined,
				},
			})
				.then(setHits)
				.catch(() => setHits([]))
				.finally(() => setSearching(false));
		}, 450);
		return () => clearTimeout(t);
	}, [query, draft.lat, draft.lng]);

	const choose = (h: Hit) => {
		patch({ lat: h.lat, lng: h.lng, placeLabel: h.label });
		setFlyTo({ lat: h.lat, lng: h.lng, zoom: 16 });
		setHits([]);
		setQuery("");
	};

	const onPick = (p: { lat: number; lng: number }) => {
		patch({ lat: p.lat, lng: p.lng });
		const seq = ++geoSeq.current;
		placeName({ data: p })
			.then((r) => {
				if (seq === geoSeq.current && r.label) patch({ placeLabel: r.label });
			})
			.catch(() => {});
	};

	const pin =
		draft.lat != null && draft.lng != null
			? { lat: draft.lat, lng: draft.lng }
			: null;
	const ready = pin && draft.placeLabel.trim() && draft.decade != null;

	return (
		<div className="space-y-5">
			<div>
				<h2 className="text-2xl font-semibold tracking-tight">
					Where and when
				</h2>
				<p className="mt-1.5 text-text-soft">
					Tap the map to drop the pin where this happened, then choose the
					decade.
				</p>
			</div>

			<div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
				<div className="panel overflow-hidden p-1.5">
					<StoryMap
						pick={pin}
						onPick={onPick}
						flyTo={flyTo}
						center={pin ?? DEFAULT_CENTER}
						zoom={pin ? 15 : 12}
						className="h-[22.5rem] rounded-xl"
					/>
				</div>

				<div className="panel space-y-5 p-5">
					{draft.placeSuggestions.length > 0 && (
						<div className="space-y-2">
							<p className="text-xs text-text-faint">Mentioned in the story</p>
							<div className="flex flex-wrap gap-2">
								{draft.placeSuggestions.map((s) => (
									<button
										key={`${s.lat}${s.lng}${s.mentioned}`}
										type="button"
										onClick={() => choose(s)}
										title={`Mentioned as ‘${s.mentioned}’`}
										className={cn(
											"inline-flex max-w-full items-center gap-1.5 rounded-full bg-raised px-3 py-1.5 text-sm text-text outline-none ring-1 ring-line-strong ring-inset hover:bg-raised-2 focus-visible:ring-2 focus-visible:ring-gold",
											draft.placeLabel === s.label &&
												"bg-gold-tint text-gold ring-gold-line",
										)}
									>
										<MapPinIcon className="size-3.5 shrink-0" />
										<span className="truncate">{s.label}</span>
									</button>
								))}
							</div>
						</div>
					)}

					<div className="space-y-1.5">
						<label htmlFor="place-search" className="text-xs text-text-faint">
							Search for a place
						</label>
						<div className="relative">
							<SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-text-faint" />
							<Input
								id="place-search"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="A street, shop or town"
								className="pl-10"
								autoComplete="off"
							/>
						</div>
						{searching && <p className="text-sm text-text-soft">Searching…</p>}
						{hits.length > 0 && (
							<ul className="overflow-hidden rounded-lg bg-raised ring-1 ring-line-strong">
								{hits.map((h) => (
									<li
										key={`${h.lat}${h.lng}`}
										className="border-b border-line last:border-0"
									>
										<button
											type="button"
											onClick={() => choose(h)}
											className="w-full px-3.5 py-2.5 text-left text-sm hover:bg-raised-2"
										>
											{h.label}
										</button>
									</li>
								))}
							</ul>
						)}
					</div>

					<div className="space-y-1.5">
						<label htmlFor="place-label" className="text-xs text-text-faint">
							Name of the place
						</label>
						<Input
							id="place-label"
							value={draft.placeLabel}
							onChange={(e) => patch({ placeLabel: e.target.value })}
							placeholder={pin ? "Twijnstraat, Utrecht" : "Drop a pin first"}
							maxLength={200}
						/>
					</div>
				</div>
			</div>

			<section className="panel space-y-4 p-5 sm:p-6">
				<div className="flex flex-wrap items-end justify-between gap-3">
					<div>
						<h3 className="text-lg font-semibold">When was this?</h3>
						<p className="mt-1 text-sm text-text-soft" aria-live="polite">
							{draft.year
								? `Around ${draft.year}.`
								: draft.decade
									? `Around the ${decadeLabel(draft.decade)}.`
									: "Drag across the bars to the decade, or enter a year. A guess is fine."}
						</p>
					</div>
					<div className="space-y-1.5">
						<label htmlFor="story-year" className="text-xs text-text-faint">
							Exact year (optional)
						</label>
						<Input
							id="story-year"
							type="number"
							inputMode="numeric"
							min={1880}
							max={2100}
							value={draft.year ?? ""}
							onChange={(e) => {
								const y = e.target.value ? Number(e.target.value) : null;
								patch({
									year: y,
									...(y && y >= 1880 && y <= 2100
										? { decade: Math.floor(y / 10) * 10 }
										: {}),
								});
							}}
							className="numerals w-32"
						/>
					</div>
				</div>
				{/* "All years" makes no sense here, so the dial's reset key is hidden and null is ignored */}
				<DecadeDial
					value={draft.decade}
					counts={counts}
					onChange={(d) =>
						d != null &&
						patch({
							decade: d,
							year:
								draft.year && Math.floor(draft.year / 10) * 10 !== d
									? null
									: draft.year,
						})
					}
					className="[&_button]:hidden"
				/>
			</section>

			<div className="flex flex-wrap items-center gap-3">
				<Button variant="gold" disabled={!ready} onClick={onNext}>
					Continue
				</Button>
				<Button variant="ghost" onClick={onBack}>
					Back
				</Button>
				{!ready && (
					<span className="text-sm text-text-soft">
						Drop a pin and choose a decade to continue.
					</span>
				)}
			</div>
		</div>
	);
}
