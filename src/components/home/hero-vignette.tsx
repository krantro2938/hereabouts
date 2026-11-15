import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRightIcon, MapPinIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { DecadeDial } from "#/components/decade-dial";
import { useIsDesktop } from "#/components/explore/use-is-desktop";
import { StoryMap } from "#/components/story-map";
import { Button } from "#/components/ui/button";
import { decadeColor, decadeLabel, formatDuration } from "#/lib/decades";
import { mapStoriesQuery } from "#/lib/queries";

/**
 * The hero visual is the product itself: a framed app window with the live
 * night map, a hover card and the decade scrubber. Tuning a decade swaps the card.
 * The one load moment: the card slides in after the pins have settled.
 */
export function HeroVignette() {
	const { data: pins = [] } = useQuery(mapStoriesQuery("public"));
	const wide = useIsDesktop("(min-width: 640px)");
	const canPan = useIsDesktop("(min-width: 1024px)");
	const [decade, setDecade] = useState<number | null>(null);
	const [picked, setPicked] = useState<string | null>(null);

	const counts = useMemo(() => {
		const c: Record<number, number> = {};
		for (const p of pins) c[p.decade] = (c[p.decade] ?? 0) + 1;
		return c;
	}, [pins]);

	const shown = useMemo(() => {
		const pool =
			decade == null ? pins : pins.filter((p) => p.decade === decade);
		return (
			pool.find((p) => p.id === picked) ??
			(decade == null
				? pool.find((p) => p.id === "sample-ria-bakery")
				: null) ??
			pool[0] ??
			null
		);
	}, [pins, decade, picked]);

	return (
		<div className="overflow-hidden rounded-2xl bg-panel shadow-float ring-1 ring-line-strong">
			<style>{`
				@media (prefers-reduced-motion: no-preference) {
					.hero-card { animation: hero-card-in 520ms cubic-bezier(.2,.7,.2,1) 1100ms both; }
					@keyframes hero-card-in { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
				}
			`}</style>
			<div className="flex h-11 items-center gap-3 border-b border-line px-4">
				<span className="flex gap-1.5" aria-hidden>
					<span className="size-2.5 rounded-full bg-raised-2" />
					<span className="size-2.5 rounded-full bg-raised-2" />
					<span className="size-2.5 rounded-full bg-raised-2" />
				</span>
				<span className="mx-auto flex h-7 w-full max-w-xs items-center gap-2 rounded-full bg-raised px-3 text-xs text-text-faint">
					<SearchIcon className="size-3.5" aria-hidden />
					Search streets and storytellers
				</span>
				<span className="hidden w-12 sm:block" aria-hidden />
			</div>
			<div className="relative h-[26rem] sm:h-[34rem] lg:h-[38rem]">
				<StoryMap
					pins={pins}
					activeDecade={decade}
					selectedId={shown?.id ?? null}
					onSelect={(id) => id && setPicked(id)}
					interactive={canPan}
					fitPins
					zoom={12.6}
					bottomInset={96}
					className="absolute inset-0"
				/>
				<div className="pointer-events-none absolute inset-x-3 top-3 sm:inset-x-auto sm:top-5 sm:left-5 sm:w-[19rem]">
					{shown ? (
						<HeroCard key={shown.id} pin={shown} />
					) : (
						decade != null && (
							<div className="panel-float p-4 text-sm text-text-soft ring-1 ring-line-strong">
								Nobody has recorded the {decadeLabel(decade)} here yet.
							</div>
						)
					)}
				</div>
				<div className="absolute inset-x-3 bottom-3 mx-auto max-w-2xl sm:bottom-5">
					<DecadeDial
						compact={!wide}
						value={decade}
						onChange={(d) => {
							setDecade(d);
							setPicked(null);
						}}
						counts={counts}
					/>
				</div>
			</div>
		</div>
	);
}

function HeroCard({
	pin,
}: {
	pin: {
		id: string;
		title: string;
		decade: number;
		placeLabel?: string;
		storytellerName?: string;
		durationMs?: number | null;
	};
}) {
	return (
		<div className="hero-card pointer-events-auto rounded-2xl border border-gold-line bg-panel/95 p-4 shadow-float backdrop-blur-md">
			<span className="flex w-fit max-w-full items-center gap-2 rounded-full bg-raised px-3 py-1.5">
				<span className="truncate text-sm font-medium text-text">
					{pin.title}
				</span>
				<span
					aria-hidden
					className="size-2 shrink-0 rounded-full"
					style={{ background: decadeColor(pin.decade) }}
				/>
			</span>
			<p className="mt-3 flex items-center gap-1.5 text-[0.8125rem] text-text-soft">
				<MapPinIcon className="size-3.5 text-text-faint" aria-hidden />
				{pin.placeLabel}
			</p>
			<div className="mt-4 flex items-end gap-6">
				<div>
					<div className="text-xs text-text-faint">Told by</div>
					<div className="text-sm font-semibold text-text">
						{pin.storytellerName}
					</div>
				</div>
				<div>
					<div className="text-xs text-text-faint">Length</div>
					<div className="numerals text-sm text-text">
						{formatDuration(pin.durationMs)}
					</div>
				</div>
				<Button asChild variant="outline" size="icon-sm" className="ml-auto">
					<Link
						to="/s/$storyId"
						params={{ storyId: pin.id }}
						aria-label={`Open ${pin.title}`}
					>
						<ArrowRightIcon />
					</Link>
				</Button>
			</div>
		</div>
	);
}
