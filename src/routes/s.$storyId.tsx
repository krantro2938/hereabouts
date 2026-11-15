import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronRightIcon, LinkIcon, MapPinIcon } from "lucide-react";
import { toast } from "sonner";
import { Page } from "#/components/app-shell";
import { AudioPlayer } from "#/components/audio-player";
import { DecadeTag } from "#/components/decade";
import { EditStoryDialog } from "#/components/explore/edit-story-dialog";
import { paragraphs, storyQuery } from "#/components/explore/queries";
import {
	ConnectedRow,
	DeleteStory,
	DetailsList,
	formatRecorded,
	ReportStory,
	SectionLabel,
	VisibilityDot,
} from "#/components/explore/story-parts";
import { StoryMap } from "#/components/story-map";
import { StoryPhoto } from "#/components/story-photo";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { audioUrl } from "#/lib/audio";
import { formatDuration, whenLabel } from "#/lib/decades";

export const Route = createFileRoute("/s/$storyId")({
	loader: async ({ context, params }) => {
		const data = await context.queryClient.ensureQueryData(
			storyQuery(params.storyId),
		);
		if (!data) throw notFound();
		return { title: data.story.title };
	},
	head: ({ loaderData }) => ({
		meta: [
			{ title: loaderData ? `${loaderData.title} | Hereabouts` : "Hereabouts" },
		],
	}),
	component: StoryPage,
});

function StoryPage() {
	const { storyId } = Route.useParams();
	const { data } = useQuery(storyQuery(storyId));
	if (!data) return null;
	const { story, storyteller, authorName, canEdit, connections } = data;
	const dur = formatDuration(story.durationMs);
	const pin = {
		id: story.id,
		lat: story.lat,
		lng: story.lng,
		decade: story.decade,
		title: story.title,
	};

	return (
		<Page className="max-w-6xl">
			<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
				<article className="min-w-0">
					<h1 className="text-2xl font-semibold tracking-tight text-balance">
						{story.title}
					</h1>
					<p className="mt-1.5 flex items-center gap-1.5 text-sm text-text-soft">
						<MapPinIcon
							className="size-4 shrink-0 text-text-faint"
							aria-hidden
						/>
						{story.placeLabel}
					</p>
					<div className="mt-3 flex flex-wrap items-center gap-2">
						<DecadeTag decade={story.decade} year={story.year} />
						{story.isSample && <Badge variant="secondary">Sample</Badge>}
						{story.tags.map((t) => (
							<Badge key={t} variant="outline">
								{t}
							</Badge>
						))}
					</div>

					<StoryPhoto
						file={story.photoFile}
						credit={story.photoCredit}
						sourceUrl={story.photoSourceUrl}
						alt={story.placeLabel}
						className="mt-6 aspect-[16/10] rounded-2xl"
					/>

					{story.audioFile && (
						<div className="panel mt-6 p-5">
							<AudioPlayer
								src={audioUrl(story.audioFile)}
								durationMs={story.durationMs}
							/>
						</div>
					)}

					{story.isSample && (
						<p className="mt-4 text-sm text-text-faint">
							A sample story, written for the demo and read by a synthetic
							voice.
						</p>
					)}

					<div className="prose-story mt-8">
						{paragraphs(story.body).map((p) => (
							<p key={p}>{p}</p>
						))}
					</div>

					{story.transcript && (
						<details className="group panel mt-10">
							<summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-gold [&::-webkit-details-marker]:hidden">
								<ChevronRightIcon className="size-4 text-text-faint transition-transform group-open:rotate-90" />
								Transcript
								<span className="ml-1 font-normal text-text-faint">
									Exactly as it was said
								</span>
							</summary>
							<div className="prose-story px-4 pb-5">
								<p className="whitespace-pre-line">{story.transcript}</p>
							</div>
						</details>
					)}

					<div className="mt-8 flex flex-wrap items-center gap-2 border-t border-line pt-5">
						{canEdit ? (
							<>
								<EditStoryDialog story={story} />
								<DeleteStory id={story.id} />
							</>
						) : (
							story.visibility === "public" && <ReportStory id={story.id} />
						)}
					</div>
				</article>

				<aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
					<StoryMap
						className="h-[200px] rounded-2xl ring-1 ring-line-strong"
						pins={[pin]}
						selectedId={story.id}
						center={{ lat: story.lat, lng: story.lng }}
						zoom={15.5}
						interactive={false}
					/>

					<section>
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
								{ label: "Recorded by", value: authorName },
								{
									label: "When",
									value: whenLabel(story.decade, story.year).replace(
										/^the /,
										"",
									),
								},
								{ label: "Place", value: story.placeLabel },
								{ label: "Recorded", value: formatRecorded(story.createdAt) },
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
					</section>

					{connections.length > 0 && (
						<section>
							<SectionLabel className="mb-2">Connected memories</SectionLabel>
							<div className="flex flex-col gap-2">
								{connections.map((c) => (
									<ConnectedRow key={c.id} c={c} />
								))}
							</div>
						</section>
					)}

					<Button
						variant="outline"
						className="self-start"
						onClick={async () => {
							try {
								await navigator.clipboard.writeText(window.location.href);
								toast.success("Link copied.");
							} catch {
								toast.error("Couldn’t copy the link.");
							}
						}}
					>
						<LinkIcon />
						Copy link
					</Button>
				</aside>
			</div>
		</Page>
	);
}
