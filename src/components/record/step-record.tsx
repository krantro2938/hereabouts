import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { Textarea } from "#/components/ui/textarea";
import { myStorytellersQuery } from "#/lib/queries";
import { cn } from "#/lib/utils";
import { nextQuestions } from "#/server/fns/record";
import { RecordConsole } from "./record-console";
import { uploadAudio } from "./state";
import { useRecorder } from "./use-recorder";

type Result = {
	transcript: string;
	audioFile: string | null;
	audioMime: string | null;
	durationMs: number | null;
	typed: boolean;
};

export function StepRecord({
	storytellerId,
	onDone,
	onBack,
}: {
	storytellerId: string;
	onDone: (r: Result) => void;
	onBack: () => void;
}) {
	const { data: tellers } = useQuery(myStorytellersQuery);
	const teller = tellers?.find((t) => t.id === storytellerId);
	const name = teller?.name ?? "them";

	const rec = useRecorder();
	const [questions, setQuestions] = useState<string[]>([]);
	const [qIndex, setQIndex] = useState(0);
	const [loadingQ, setLoadingQ] = useState(true);
	const [listening, setListening] = useState(false);
	const asked = useRef<string[]>([]);
	const [saving, setSaving] = useState(false);
	const [typing, setTyping] = useState(false);
	const [typed, setTyped] = useState("");
	const lastPreviewAt = useRef(0);

	// first questions
	useEffect(() => {
		let live = true;
		nextQuestions({ data: { storytellerId, transcriptSoFar: "", asked: [] } })
			.then((r) => {
				if (!live) return;
				setQuestions(r.questions);
				setQIndex(0);
				asked.current = r.questions.slice(0, 1);
			})
			.catch(() => {})
			.finally(() => live && setLoadingQ(false));
		return () => {
			live = false;
		};
	}, [storytellerId]);

	const question = questions[qIndex];
	const another = () => {
		if (!questions.length) return;
		const i = (qIndex + 1) % questions.length;
		setQIndex(i);
		if (!asked.current.includes(questions[i])) asked.current.push(questions[i]);
	};

	const canSuggest =
		(rec.state === "recording" || rec.state === "paused") &&
		rec.elapsedMs >= 15_000;
	const suggestFromSpeech = async () => {
		const blob = rec.snapshot();
		if (!blob || listening) return;
		setListening(true);
		try {
			const up = await uploadAudio(blob, true);
			const r = await nextQuestions({
				data: {
					storytellerId,
					transcriptSoFar: up.transcript ?? "",
					asked: asked.current.slice(-12),
					language: up.language,
				},
			});
			if (r.questions.length) {
				setQuestions(r.questions);
				setQIndex(0);
				asked.current.push(r.questions[0]);
			}
		} catch {
			toast("Couldn’t listen back just now. Try another question.");
		} finally {
			setListening(false);
			lastPreviewAt.current = Date.now();
		}
	};

	const finish = async () => {
		setSaving(true);
		const { blob, durationMs } = await rec.stop();
		if (!blob || blob.size === 0) {
			setSaving(false);
			rec.reset();
			toast("Nothing was recorded. Try again, or type the memory instead.");
			return;
		}
		try {
			const up = await uploadAudio(blob);
			onDone({
				transcript: up.transcript ?? "",
				audioFile: up.audioFile,
				audioMime: up.audioMime,
				durationMs,
				typed: false,
			});
		} catch (e) {
			setSaving(false);
			toast.error((e as Error).message);
			rec.reset();
		}
	};

	if (saving) {
		return (
			<div className="panel mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-12 text-center">
				<span className="size-3 animate-pulse rounded-full bg-gold" />
				<p className="text-lg font-semibold">
					Saving the recording and writing it down…
				</p>
				<p className="text-sm text-text-soft">
					This can take a minute for a long story.
				</p>
			</div>
		);
	}

	if (typing) {
		return (
			<div className="mx-auto max-w-2xl space-y-4">
				<h2 className="text-2xl font-semibold tracking-tight">
					Type the memory
				</h2>
				<p className="text-text-soft">
					Write or paste what {name} remembered. You can tidy it on the next
					screen.
				</p>
				<Textarea
					value={typed}
					onChange={(e) => setTyped(e.target.value)}
					rows={12}
					className="min-h-64"
					placeholder="I remember the bakery on the corner…"
					aria-label="The memory"
				/>
				<div className="flex flex-wrap gap-3">
					<Button
						variant="gold"
						disabled={typed.trim().length < 10}
						onClick={() =>
							onDone({
								transcript: typed.trim(),
								audioFile: null,
								audioMime: null,
								durationMs: null,
								typed: true,
							})
						}
					>
						Continue
					</Button>
					<Button variant="ghost" onClick={() => setTyping(false)}>
						Record instead
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-semibold tracking-tight">
					Record {name}’s memory
				</h2>
				<p className="mt-1.5 max-w-xl text-text-soft">
					Hold the phone close, ask a question, and let {name} take their time.
					Silences are fine.
				</p>
			</div>

			<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
				<div className="space-y-3">
					<RecordConsole
						state={rec.state}
						elapsedMs={rec.elapsedMs}
						levels={rec.levels}
						onStart={rec.start}
						onPause={rec.pause}
						onResume={rec.resume}
						onFinish={finish}
					/>
					{rec.error && (
						<p
							role="alert"
							className="rounded-lg bg-panel px-4 py-3 text-sm text-text ring-1 ring-on-air/50"
						>
							{rec.error}
						</p>
					)}
					{rec.liveWords && rec.state !== "idle" && (
						<p
							className="min-h-6 px-1 text-sm text-text-soft italic"
							aria-live="off"
						>
							{rec.liveWords}
						</p>
					)}
				</div>

				<section
					aria-label="Interview question"
					className="panel space-y-4 p-5"
				>
					<div className="text-xs text-text-faint">Ask next</div>
					<div className="min-h-24">
						{loadingQ ? (
							<div className="space-y-3 pt-1">
								<Skeleton className="h-5 w-full" />
								<Skeleton className="h-5 w-4/5" />
							</div>
						) : (
							<p
								className={cn(
									"text-[1.125rem] leading-snug font-medium text-text",
									listening && "opacity-50",
								)}
							>
								{question ??
									"What is the first place you remember from when you were small?"}
							</p>
						)}
					</div>
					<div className="flex flex-col gap-2">
						{canSuggest && (
							<Button
								type="button"
								variant="gold-soft"
								onClick={suggestFromSpeech}
								disabled={listening}
							>
								Suggest from what {name} said
							</Button>
						)}
						<Button
							type="button"
							variant="ghost"
							onClick={another}
							disabled={questions.length < 2 || listening}
						>
							Another question
						</Button>
					</div>
					{!canSuggest && (
						<p className="text-xs text-text-faint">
							Suggestions from what {name} says appear after 15 seconds of
							recording.
						</p>
					)}
					{listening && (
						<p className="text-sm text-text-soft" aria-live="polite">
							Listening back…
						</p>
					)}
				</section>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => setTyping(true)}
					disabled={rec.state !== "idle"}
				>
					Type it instead
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={onBack}
					disabled={rec.state !== "idle"}
				>
					Change storyteller
				</Button>
			</div>
		</div>
	);
}
