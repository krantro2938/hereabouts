import { Link } from "@tanstack/react-router";
import { ArrowRightIcon, MapPinIcon } from "lucide-react";
import {
	type Visibility,
	VisibilityDot,
} from "#/components/explore/story-parts";
import { decadeColor, formatDuration } from "#/lib/decades";
import { cn } from "#/lib/utils";

export type RowStory = {
	id: string;
	title: string;
	decade: number;
	year: number | null;
	placeLabel: string;
	storytellerName: string;
	durationMs: number | null;
	hasAudio?: boolean;
	visibility?: Visibility;
};

/** One memory in a list: decade dot, title, place, length, visibility dot, chevron. */
export function StoryRow({ story }: { story: RowStory }) {
	const dur = formatDuration(story.durationMs);
	return (
		<li>
			<Link
				to="/s/$storyId"
				params={{ storyId: story.id }}
				className="group flex min-h-16 items-center gap-3.5 rounded-xl border border-line bg-panel px-4 py-3 outline-none transition-colors hover:border-line-strong hover:bg-raised focus-visible:ring-2 focus-visible:ring-gold"
			>
				<span
					aria-hidden
					className="size-2.5 shrink-0 rounded-full"
					style={{ background: decadeColor(story.decade) }}
				/>
				<div className="min-w-0 flex-1">
					<h3 className="truncate text-sm font-medium text-text">
						{story.title}
					</h3>
					<p className="mt-0.5 flex items-center gap-1.5 truncate text-[0.8125rem] text-text-soft">
						<MapPinIcon
							className="size-3.5 shrink-0 text-text-faint"
							aria-hidden
						/>
						<span className="truncate">
							{story.placeLabel}
							<span className="text-text-faint">
								{" "}
								told by {story.storytellerName}
							</span>
						</span>
					</p>
				</div>
				<div className="hidden shrink-0 items-center gap-5 text-[0.8125rem] sm:flex">
					<span className="numerals w-10 text-right text-text-soft">
						{story.year ?? ""}
					</span>
					{dur && (
						<span className="numerals w-10 text-right text-text-soft">
							{dur}
						</span>
					)}
					{story.visibility && (
						<VisibilityDot
							visibility={story.visibility}
							short
							className="w-16 text-text-soft"
						/>
					)}
				</div>
				<span
					className={cn(
						"flex size-8 shrink-0 items-center justify-center rounded-full text-text-faint ring-1 ring-line-strong transition-colors",
						"group-hover:bg-gold group-hover:text-gold-ink group-hover:ring-gold",
					)}
				>
					<ArrowRightIcon className="size-4" />
				</span>
			</Link>
		</li>
	);
}

export function EmptyInvite({
	title,
	children,
}: {
	title?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-2xl border border-dashed border-line-strong p-6 sm:p-8">
			{title && <p className="text-lg font-semibold tracking-tight">{title}</p>}
			<div className="mt-2 max-w-prose text-sm text-text-soft">{children}</div>
		</div>
	);
}
