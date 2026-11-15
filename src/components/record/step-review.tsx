import { ChevronDownIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AudioPlayer } from "#/components/audio-player";
import { PhotoPicker } from "#/components/photo-picker";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Skeleton } from "#/components/ui/skeleton";
import { Textarea } from "#/components/ui/textarea";
import { audioUrl } from "#/lib/audio";
import { clampDecade } from "#/lib/decades";
import { shapeTranscript } from "#/server/fns/record";
import type { Draft } from "./state";

export function StepReview({
	draft,
	tellerName,
	patch,
	onBack,
	onNext,
}: {
	draft: Draft;
	tellerName: string;
	patch: (p: Partial<Draft>) => void;
	onBack: () => void;
	onNext: () => void;
}) {
	const [shaping, setShaping] = useState(!draft.shaped);
	const [tagText, setTagText] = useState("");
	const started = useRef(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: run once per entry
	useEffect(() => {
		if (draft.shaped || started.current) return;
		started.current = true;
		const text = draft.transcript.trim();
		if (!text) {
			patch({ shaped: true, source: "manual" });
			setShaping(false);
			return;
		}
		shapeTranscript({
			data: { storytellerId: draft.storytellerId as string, transcript: text },
		})
			.then((r) => {
				const s = r.story;
				const first = r.placeSuggestions[0];
				patch({
					shaped: true,
					source: r.source,
					title: s.title,
					summary: s.summary,
					body: s.body,
					tags: s.tags,
					placeSuggestions: r.placeSuggestions,
					decade: s.decade ? clampDecade(s.decade) : draft.decade,
					year: s.year,
					...(first && draft.lat == null
						? { lat: first.lat, lng: first.lng, placeLabel: first.label }
						: {}),
				});
			})
			.catch(() => {
				toast("We couldn’t tidy the story, so here it is as it was said.");
				patch({
					shaped: true,
					source: "manual",
					body: text,
					title: draft.title || "A memory",
				});
			})
			.finally(() => setShaping(false));
	}, []);

	if (shaping) {
		return (
			<div className="mx-auto max-w-3xl space-y-5" aria-busy>
				<h2 className="text-2xl font-semibold tracking-tight">Read it back</h2>
				<p className="text-text-soft">
					Writing {tellerName}’s memory out as a story…
				</p>
				<div className="panel space-y-3 p-5">
					<Skeleton className="h-8 w-3/4" />
					{[100, 92, 97, 60].map((w) => (
						<Skeleton key={w} className="h-5" style={{ width: `${w}%` }} />
					))}
				</div>
			</div>
		);
	}

	const empty = !draft.transcript.trim();
	const addTag = () => {
		const t = tagText.trim().toLowerCase().replace(/^#/, "");
		if (t && !draft.tags.includes(t) && draft.tags.length < 8)
			patch({ tags: [...draft.tags, t] });
		setTagText("");
	};
	const ready = draft.title.trim() && draft.body.trim();

	return (
		<div className="mx-auto max-w-3xl space-y-5">
			<div>
				<h2 className="text-2xl font-semibold tracking-tight">Read it back</h2>
				{empty && !draft.typed ? (
					<p className="mt-1.5 text-text-soft">
						The recording is saved, but we couldn’t write it down automatically.
						Type what {tellerName} said below.
					</p>
				) : (
					<p className="mt-1.5 text-text-soft">
						Fix anything that doesn’t sound right. It’s {tellerName}’s story.
					</p>
				)}
			</div>

			{draft.audioFile && (
				<div className="panel p-4">
					<AudioPlayer
						src={audioUrl(draft.audioFile)}
						durationMs={draft.durationMs}
					/>
				</div>
			)}

			{draft.source === "ai" && (
				<p className="flex items-center gap-2 rounded-lg bg-sunk px-4 py-3 text-sm text-text-soft ring-1 ring-line ring-inset">
					<Badge variant="secondary">Suggested</Badge>
					We tidied the transcript into a story in {tellerName}’s own words.
					Check it reads right.
				</p>
			)}

			<div className="panel space-y-5 p-5 sm:p-6">
				<div className="space-y-1.5">
					<label htmlFor="story-title" className="text-xs text-text-faint">
						Title
					</label>
					<Input
						id="story-title"
						value={draft.title}
						onChange={(e) => patch({ title: e.target.value })}
						maxLength={120}
						className="h-12 text-lg font-semibold"
					/>
				</div>

				<div className="space-y-1.5">
					<label htmlFor="story-body" className="text-xs text-text-faint">
						The story
					</label>
					<Textarea
						id="story-body"
						value={draft.body}
						onChange={(e) => patch({ body: e.target.value })}
						rows={12}
						className="prose-story min-h-64 max-w-none bg-sunk"
					/>
				</div>

				<PhotoPicker
					value={draft.photoFile ?? null}
					onChange={(file) => patch({ photoFile: file })}
				/>
			</div>

			{draft.transcript && !draft.typed && (
				<details className="group panel px-4 py-3">
					<summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
						Exactly as it was said
						<ChevronDownIcon className="size-4 text-text-soft transition-transform group-open:rotate-180" />
					</summary>
					<p className="mt-2 text-sm text-text-soft">
						Kept with the recording, word for word.
					</p>
					<p className="prose-story mt-3 whitespace-pre-wrap text-base">
						{draft.transcript}
					</p>
				</details>
			)}

			<div className="panel space-y-2 p-5">
				<label htmlFor="story-tag" className="text-xs text-text-faint">
					Tags (optional)
				</label>
				{draft.tags.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{draft.tags.map((t) => (
							<span
								key={t}
								className="inline-flex items-center gap-1 rounded-full bg-raised py-0.5 pr-1 pl-3 text-sm"
							>
								{t}
								<button
									type="button"
									aria-label={`Remove ${t}`}
									className="grid size-6 place-items-center rounded-full text-text-soft hover:bg-raised-2 hover:text-text"
									onClick={() =>
										patch({ tags: draft.tags.filter((x) => x !== t) })
									}
								>
									<XIcon className="size-3.5" />
								</button>
							</span>
						))}
					</div>
				)}
				<Input
					id="story-tag"
					value={tagText}
					onChange={(e) => setTagText(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === ",") {
							e.preventDefault();
							addTag();
						}
					}}
					onBlur={addTag}
					placeholder="bakery, school, flood"
					className="max-w-xs"
				/>
			</div>

			<div className="flex flex-wrap gap-3">
				<Button variant="gold" disabled={!ready} onClick={onNext}>
					Continue
				</Button>
				<Button variant="ghost" onClick={onBack}>
					Back
				</Button>
			</div>
		</div>
	);
}
