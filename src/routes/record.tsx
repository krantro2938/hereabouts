import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckIcon } from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "#/components/app-shell";
import {
	clearDraft,
	type Draft,
	initialDraft,
	loadDraft,
	reducer,
	STEPS,
	saveDraft,
} from "#/components/record/state";
import { StepPlace } from "#/components/record/step-place";
import { StepRecord } from "#/components/record/step-record";
import { StepReview } from "#/components/record/step-review";
import { StepShare } from "#/components/record/step-share";
import { StepTeller } from "#/components/record/step-teller";
import { type CardStory, StoryCard } from "#/components/story-card";
import { Button } from "#/components/ui/button";
import { meQuery, myStorytellersQuery } from "#/lib/queries";
import { cn } from "#/lib/utils";
import { createStory } from "#/server/fns/stories";

export const Route = createFileRoute("/record")({
	validateSearch: (s: Record<string, unknown>): { storyteller?: string } => ({
		storyteller:
			typeof s.storyteller === "string" && s.storyteller
				? s.storyteller
				: undefined,
	}),
	head: () => ({ meta: [{ title: "Record a memory | Hereabouts" }] }),
	component: RecordPage,
});

function RecordPage() {
	const { data: me, isLoading } = useQuery(meQuery);
	return (
		<AppShell>
			<div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
				{isLoading ? null : me ? <Flow /> : <Gate />}
			</div>
		</AppShell>
	);
}

function Gate() {
	return (
		<div className="panel mx-auto mt-10 max-w-lg space-y-5 p-6 sm:p-8">
			<h1 className="text-2xl font-semibold tracking-tight">Record a memory</h1>
			<p className="text-text-soft">
				Sign in to record. Your recordings stay private until you choose to
				share them.
			</p>
			<div className="flex flex-wrap gap-3">
				<Button asChild variant="gold">
					<a href="/signin?redirect=/record">Sign in</a>
				</Button>
				<Button asChild variant="outline">
					<a href="/signup?redirect=/record">Create an account</a>
				</Button>
			</div>
		</div>
	);
}

function StepBar({ step }: { step: number }) {
	return (
		<ol className="grid grid-cols-5 gap-1.5 sm:gap-2" aria-label="Steps">
			{STEPS.map((s) => {
				const on = s.n === step;
				const done = s.n < step;
				return (
					<li
						key={s.n}
						aria-current={on ? "step" : undefined}
						className={cn(
							"flex min-w-0 flex-col gap-2 rounded-xl border px-2.5 py-2 sm:flex-row sm:items-center sm:px-3",
							on
								? "border-gold-line bg-gold-tint text-text"
								: done
									? "border-line bg-panel text-text-soft"
									: "border-line bg-sunk text-text-faint",
						)}
					>
						<span
							className={cn(
								"numerals grid size-6 shrink-0 place-items-center rounded-full text-xs",
								on
									? "bg-gold text-gold-ink"
									: done
										? "bg-raised-2 text-ok"
										: "ring-1 ring-line-strong ring-inset",
							)}
						>
							{done ? <CheckIcon className="size-3.5" /> : s.n}
						</span>
						<span
							className={cn(
								"truncate text-[0.8125rem] font-medium max-sm:hidden",
								on && "text-gold",
							)}
						>
							{s.label}
						</span>
					</li>
				);
			})}
		</ol>
	);
}

function Done({
	story,
	onAnother,
}: {
	story: CardStory;
	onAnother: () => void;
}) {
	return (
		<div className="panel mx-auto max-w-xl space-y-6 p-6 text-center sm:p-8">
			<span className="mx-auto grid size-12 place-items-center rounded-full bg-ok/15 text-ok ring-1 ring-ok/30">
				<CheckIcon className="size-6" />
			</span>
			<div>
				<h2 className="text-lg font-semibold">Memory saved</h2>
				<p className="mt-1 text-sm text-text-soft">
					It is on your archive, and on the map for whoever you chose.
				</p>
			</div>
			<div className="text-left">
				<StoryCard story={story} showVisibility />
			</div>
			<div className="flex flex-wrap justify-center gap-3">
				<Button variant="outline" onClick={onAnother}>
					Record another
				</Button>
				<Button asChild variant="gold">
					<Link to="/map">See it on the map</Link>
				</Button>
			</div>
		</div>
	);
}

function Flow() {
	const { storyteller } = Route.useSearch();
	const qc = useQueryClient();
	const { data: tellers } = useQuery(myStorytellersQuery);
	const [draft, dispatch] = useReducer(reducer, initialDraft);
	const [hydrated, setHydrated] = useState(false);
	const [saving, setSaving] = useState(false);
	const [done, setDone] = useState<CardStory | null>(null);
	const headRef = useRef<HTMLDivElement>(null);

	// restore a saved draft, then let ?storyteller= preselect step 1
	// biome-ignore lint/correctness/useExhaustiveDependencies: once on mount
	useEffect(() => {
		const saved = loadDraft();
		if (saved)
			dispatch({
				type: "replace",
				draft:
					saved.step === 2
						? { ...saved, step: saved.audioFile || saved.transcript ? 3 : 2 }
						: saved,
			});
		if (storyteller)
			dispatch({
				type: "patch",
				patch: {
					storytellerId: storyteller,
					step: saved?.storytellerId === storyteller ? (saved?.step ?? 1) : 1,
				},
			});
		setHydrated(true);
	}, []);

	useEffect(() => {
		if (hydrated) saveDraft(draft);
	}, [draft, hydrated]);

	// drop a stale storyteller id (deleted, or not ours)
	useEffect(() => {
		if (
			hydrated &&
			tellers &&
			draft.storytellerId &&
			!tellers.some((t) => t.id === draft.storytellerId)
		) {
			dispatch({ type: "patch", patch: { storytellerId: null, step: 1 } });
		}
	}, [hydrated, tellers, draft.storytellerId]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll on step change
	useEffect(() => {
		if (hydrated) headRef.current?.scrollIntoView({ block: "start" });
	}, [draft.step, hydrated]);

	const patch = (p: Partial<Draft>) => dispatch({ type: "patch", patch: p });
	const go = (step: Draft["step"]) => patch({ step });
	const teller = tellers?.find((t) => t.id === draft.storytellerId);
	const tellerName = teller?.name ?? "them";

	const save = async (circleId: string | null) => {
		if (
			draft.storytellerId == null ||
			draft.lat == null ||
			draft.lng == null ||
			draft.decade == null
		)
			return;
		setSaving(true);
		try {
			const { id } = await createStory({
				data: {
					storytellerId: draft.storytellerId,
					title: draft.title,
					summary: draft.summary,
					body: draft.body,
					transcript: draft.transcript,
					audioFile: draft.audioFile,
					audioMime: draft.audioMime,
					photoFile: draft.photoFile,
					durationMs: draft.durationMs,
					lat: draft.lat,
					lng: draft.lng,
					placeLabel: draft.placeLabel,
					decade: draft.decade,
					year: draft.year,
					tags: draft.tags,
					visibility: draft.visibility,
					circleId: draft.visibility === "circle" ? circleId : null,
				},
			});
			toast("Memory saved");
			clearDraft();
			await Promise.all([
				qc.invalidateQueries({ queryKey: ["map-stories"] }),
				qc.invalidateQueries({ queryKey: ["decade-counts"] }),
				qc.invalidateQueries({ queryKey: ["storytellers"] }),
				qc.invalidateQueries({ queryKey: ["my-stories"] }),
			]);
			setDone({
				id,
				title: draft.title,
				placeLabel: draft.placeLabel,
				decade: draft.decade,
				year: draft.year,
				storytellerName: teller?.name ?? "",
				durationMs: draft.durationMs,
				photoFile: draft.photoFile,
				visibility: draft.visibility,
			});
			dispatch({ type: "reset" });
			setSaving(false);
		} catch (e) {
			setSaving(false);
			toast.error(
				(e as Error).message || "The memory could not be saved. Try again.",
			);
		}
	};

	if (!hydrated) return null;

	if (done)
		return (
			<Done
				story={done}
				onAnother={() => {
					setDone(null);
					dispatch({ type: "reset" });
				}}
			/>
		);

	return (
		<div className="space-y-6">
			<div ref={headRef} className="scroll-mt-4">
				<StepBar step={draft.step} />
			</div>

			{draft.step === 1 && (
				<StepTeller
					value={draft.storytellerId}
					onChange={(id) => patch({ storytellerId: id })}
					onNext={() => go(2)}
				/>
			)}
			{draft.step === 2 && draft.storytellerId && (
				<StepRecord
					storytellerId={draft.storytellerId}
					onBack={() => go(1)}
					onDone={(r) =>
						patch({
							...r,
							shaped: false,
							source: "manual",
							step: 3,
						})
					}
				/>
			)}
			{draft.step === 3 && draft.storytellerId && (
				<StepReview
					draft={draft}
					tellerName={tellerName}
					patch={patch}
					onBack={() => go(2)}
					onNext={() => go(4)}
				/>
			)}
			{draft.step === 4 && (
				<StepPlace
					draft={draft}
					patch={patch}
					onBack={() => go(3)}
					onNext={() => go(5)}
				/>
			)}
			{draft.step === 5 && (
				<StepShare
					draft={draft}
					patch={patch}
					saving={saving}
					onBack={() => go(4)}
					onSave={save}
				/>
			)}
		</div>
	);
}
