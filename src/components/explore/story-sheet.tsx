import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRightIcon, MapPinIcon, XIcon } from "lucide-react";
import { AudioPlayer } from "#/components/audio-player";
import { DecadeTag } from "#/components/decade";
import { StoryPhoto } from "#/components/story-photo";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { audioUrl } from "#/lib/audio";
import { formatDuration, whenLabel } from "#/lib/decades";
import type { Connection } from "#/server/fns/stories";
import { EditStoryDialog } from "./edit-story-dialog";
import { paragraphs, storyQuery } from "./queries";
import {
	ConnectedRow,
	DeleteStory,
	DetailsList,
	formatRecorded,
	ReportStory,
	SectionLabel,
	VisibilityChip,
	VisibilityDot,
} from "./story-parts";

/** The body of the story panel: used in the desktop side panel and the mobile drawer. */
export function StorySheetContent({
	id,
	onSelect,
	onClose,
	showClose,
}: {
	id: string;
	onSelect: (pin: Connection) => void;
	onClose?: () => void;
	showClose?: boolean;
}) {
	const { data, isPending } = useQuery(storyQuery(id));

	if (isPending) {
		return (
			<div className="space-y-4 p-5">
				<Skeleton className="h-6 w-48" />
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-24 w-full" />
			</div>
		);
	}
	if (!data) {
		return (
			<div className="space-y-3 p-5">
				<p className="text-lg font-semibold tracking-tight">
					This memory is private now.
				</p>
				<p className="text-sm text-text-soft">
					It may have been removed, or its owner changed who can hear it.
				</p>
				{onClose && (
					<Button variant="outline" onClick={onClose}>
						Close
					</Button>
				)}
			</div>
		);
	}

	const { story, storyteller, connections, canEdit } = data;
	const body = paragraphs(story.body);
	const dur = formatDuration(story.durationMs);

	return (
		<div className="flex flex-col gap-4 p-5 pb-6">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<h2 className="text-lg leading-snug font-semibold tracking-tight text-balance">
						{story.title}
					</h2>
					<p className="mt-1 flex items-center gap-1.5 text-[0.8125rem] text-text-soft">
						<MapPinIcon
							className="size-3.5 shrink-0 text-text-faint"
							aria-hidden
						/>
						<span className="truncate">{story.placeLabel}</span>
					</p>
				</div>
				{showClose && (
					<Button
						variant="outline"
						size="icon-sm"
						className="shrink-0"
						onClick={onClose}
						aria-label="Close story"
					>
						<XIcon />
					</Button>
				)}
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<DecadeTag decade={story.decade} year={story.year} />
				{story.isSample && <Badge variant="secondary">Sample</Badge>}
				<VisibilityChip visibility={story.visibility} />
			</div>

			<StoryPhoto
				file={story.photoFile}
				credit={story.photoCredit}
				sourceUrl={story.photoSourceUrl}
				alt={story.placeLabel}
				className="aspect-[16/10] rounded-xl"
			/>

			<Tabs defaultValue="story" key={story.id} className="gap-4">
				<TabsList variant="line">
					<TabsTrigger value="story">Story</TabsTrigger>
					{story.transcript && (
						<TabsTrigger value="transcript">Transcript</TabsTrigger>
					)}
					<TabsTrigger value="connected">
						Connected
						{connections.length > 0 && (
							<span className="numerals rounded-full bg-raised-2 px-1.5 text-[0.6875rem] leading-[1.125rem] text-text">
								{connections.length}
							</span>
						)}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="story" className="flex flex-col gap-5">
					{story.audioFile && (
						<AudioPlayer
							src={audioUrl(story.audioFile)}
							durationMs={story.durationMs}
						/>
					)}
					<div className="prose-story text-[1.0625rem]!">
						{body.map((p) => (
							<p key={p}>{p}</p>
						))}
					</div>
					<div>
						<SectionLabel className="mb-1">Details</SectionLabel>
						<DetailsList
							rows={[
								{
									label: "Told by",
									value: storyteller ? (
										<Link
											to="/people/$tellerId"
											params={{ tellerId: storyteller.id }}
											className="underline decoration-line-strong underline-offset-4 hover:decoration-gold"
										>
											{storyteller.name}
										</Link>
									) : (
										"Someone who remembers"
									),
								},
								{
									label: "When",
									value: whenLabel(story.decade, story.year).replace(
										/^the /,
										"",
									),
								},
								{ label: "Place", value: story.placeLabel },
								{
									label: "Recorded",
									value: formatRecorded(story.createdAt),
								},
								{
									label: "Shared with",
									value: <VisibilityDot visibility={story.visibility} />,
								},
								...(dur
									? [
											{
												label: "Length",
												value: <span className="numerals">{dur}</span>,
											},
										]
									: []),
							]}
						/>
					</div>
				</TabsContent>

				{story.transcript && (
					<TabsContent value="transcript" className="flex flex-col gap-3">
						<p className="text-xs text-text-faint">Exactly as it was said</p>
						<div className="prose-story text-[1.0625rem]!">
							<p className="whitespace-pre-line">{story.transcript}</p>
						</div>
					</TabsContent>
				)}

				<TabsContent value="connected" className="flex flex-col gap-2">
					{connections.length === 0 ? (
						<p className="text-sm text-text-soft">
							No connected memories yet. Others recorded nearby will show up
							here.
						</p>
					) : (
						connections.map((c) => (
							<ConnectedRow key={c.id} c={c} onSelect={onSelect} />
						))
					)}
				</TabsContent>
			</Tabs>

			<div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
				<Button asChild variant="outline" size="sm">
					<Link to="/s/$storyId" params={{ storyId: story.id }}>
						Open full page
						<ArrowRightIcon />
					</Link>
				</Button>
				<div className="ml-auto flex items-center gap-2">
					{canEdit ? (
						<>
							<EditStoryDialog story={story} />
							<DeleteStory id={story.id} />
						</>
					) : (
						story.visibility === "public" && <ReportStory id={story.id} />
					)}
				</div>
			</div>
		</div>
	);
}
