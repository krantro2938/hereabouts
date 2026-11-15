import { Link } from "@tanstack/react-router";
import { ArrowRightIcon, MapPinIcon } from "lucide-react";
import { StoryPhoto } from "#/components/story-photo";
import { decadeColor, decadeLabel, formatDuration } from "#/lib/decades";
import { cn } from "#/lib/utils";

export type CardStory = {
	id: string;
	title: string;
	placeLabel: string;
	decade: number;
	year: number | null;
	storytellerName: string;
	durationMs: number | null;
	photoFile?: string | null;
	isSample?: boolean;
	visibility?: "private" | "circle" | "public";
};

const VIS_DOT = {
	private: { label: "Just me", className: "bg-text-faint" },
	circle: { label: "Family", className: "bg-signal" },
	public: { label: "Public", className: "bg-ok" },
} as const;

/**
 * A memory as a card (the station-card pattern): optional photo, the title with
 * its decade dot, the place, then Told by / Length and a round arrow.
 */
export function StoryCard({
	story,
	className,
	showVisibility,
}: {
	story: CardStory;
	className?: string;
	showVisibility?: boolean;
}) {
	const vis = story.visibility ? VIS_DOT[story.visibility] : null;
	return (
		<Link
			to="/s/$storyId"
			params={{ storyId: story.id }}
			className={cn(
				"group flex flex-col rounded-2xl border border-line bg-panel p-3 transition-colors outline-none hover:border-line-strong hover:bg-[#1f2023] focus-visible:ring-2 focus-visible:ring-gold",
				className,
			)}
		>
			{story.photoFile && (
				<StoryPhoto
					file={story.photoFile}
					alt={`${story.placeLabel}`}
					showCredit={false}
					className="mb-3 aspect-[16/10]"
				/>
			)}
			<div className="flex items-start gap-3 px-1">
				<h3 className="line-clamp-2 min-w-0 flex-1 text-[0.9375rem] leading-snug font-medium tracking-[-0.01em] text-text">
					<span
						aria-hidden
						className="mr-2 mb-px inline-block size-2 rounded-full align-middle"
						style={{ background: decadeColor(story.decade) }}
					/>
					{story.title}
				</h3>
				<span className="flex shrink-0 items-center gap-1.5">
					{story.isSample && (
						<span className="rounded-full px-2 py-0.5 text-xs text-text-faint ring-1 ring-line ring-inset">
							Sample
						</span>
					)}
					<span className="numerals rounded-full px-2 py-0.5 text-xs text-text-soft ring-1 ring-line-strong ring-inset">
						{story.year ?? decadeLabel(story.decade, true)}
					</span>
				</span>
			</div>
			<p className="mt-2 flex items-center gap-1.5 truncate px-1 text-[0.8125rem] text-text-soft">
				<MapPinIcon className="size-3.5 shrink-0 text-text-faint" aria-hidden />
				<span className="truncate">{story.placeLabel}</span>
			</p>
			<div className="mt-auto flex items-end gap-5 px-1 pt-4">
				<div className="min-w-0 flex-1">
					<div className="text-xs text-text-faint">Told by</div>
					<div className="truncate text-sm font-semibold text-text">
						{story.storytellerName}
					</div>
				</div>
				{story.durationMs ? (
					<div className="shrink-0">
						<div className="text-xs text-text-faint">Length</div>
						<div className="numerals text-sm text-text">
							{formatDuration(story.durationMs)}
						</div>
					</div>
				) : null}
				{showVisibility && vis && (
					<div className="shrink-0">
						<div className="text-xs text-text-faint">Shared</div>
						<div className="flex items-center gap-1.5 text-sm text-text">
							<span className={cn("size-1.5 rounded-full", vis.className)} />
							{vis.label}
						</div>
					</div>
				)}
				<span className="flex size-9 shrink-0 items-center justify-center rounded-full text-text ring-1 ring-line-strong transition-colors group-hover:bg-gold group-hover:text-gold-ink group-hover:ring-gold">
					<ArrowRightIcon className="size-4" />
				</span>
			</div>
		</Link>
	);
}
