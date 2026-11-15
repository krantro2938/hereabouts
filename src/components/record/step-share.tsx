import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { myCirclesQuery } from "#/lib/queries";
import { cn } from "#/lib/utils";
import { createCircle } from "#/server/fns/people";
import type { Draft, Visibility } from "./state";

const OPTIONS: { value: Visibility; title: string; body: string }[] = [
	{
		value: "private",
		title: "Just me",
		body: "Only you can see and hear this memory.",
	},
	{
		value: "circle",
		title: "Family circle",
		body: "Everyone in your family circle can listen and read.",
	},
	{
		value: "public",
		title: "Everyone on the map",
		body: "Anyone can listen. Only share stories the storyteller is happy to share.",
	},
];

const DOT: Record<Visibility, string> = {
	private: "bg-text-faint",
	circle: "bg-signal",
	public: "bg-ok",
};

export function StepShare({
	draft,
	patch,
	saving,
	onBack,
	onSave,
}: {
	draft: Draft;
	patch: (p: Partial<Draft>) => void;
	saving: boolean;
	onBack: () => void;
	onSave: (circleId: string | null) => void;
}) {
	const qc = useQueryClient();
	const { data: circles } = useQuery(myCirclesQuery);
	const [newName, setNewName] = useState("");
	const [busy, setBusy] = useState(false);

	const start = async () => {
		if (!newName.trim()) return;
		setBusy(true);
		try {
			const c = await createCircle({ data: { name: newName } });
			await qc.invalidateQueries({ queryKey: myCirclesQuery.queryKey });
			patch({ circleId: c.id });
			setNewName("");
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setBusy(false);
		}
	};

	const circleId = draft.circleId ?? circles?.[0]?.id ?? null;
	const ready = draft.visibility !== "circle" || !!circleId;

	return (
		<div className="mx-auto max-w-4xl space-y-6">
			<div>
				<h2 className="text-2xl font-semibold tracking-tight">
					Who can hear it?
				</h2>
				<p className="mt-1.5 text-text-soft">
					You can change this later from the story page.
				</p>
			</div>

			<div
				role="radiogroup"
				aria-label="Who can hear it"
				className="grid gap-3 md:grid-cols-3"
			>
				{OPTIONS.map((o) => {
					const on = draft.visibility === o.value;
					return (
						// biome-ignore lint/a11y/useSemanticElements: big custom radio card
						<button
							key={o.value}
							type="button"
							role="radio"
							aria-checked={on}
							onClick={() =>
								patch({
									visibility: o.value,
									circleId: o.value === "circle" ? circleId : draft.circleId,
								})
							}
							className={cn(
								"flex flex-col items-start gap-3 rounded-2xl border border-line bg-panel p-5 text-left outline-none transition-colors hover:border-line-strong focus-visible:ring-2 focus-visible:ring-gold",
								on && "border-gold bg-gold-tint ring-1 ring-gold",
							)}
						>
							<span
								aria-hidden
								className={cn("size-2.5 rounded-full", DOT[o.value])}
							/>
							<span>
								<span className="block text-base font-semibold text-text">
									{o.title}
								</span>
								<span className="mt-1 block text-sm text-text-soft">
									{o.body}
								</span>
							</span>
						</button>
					);
				})}
			</div>

			{draft.visibility === "circle" && (
				<div className="panel space-y-3 p-5">
					{circles && circles.length > 0 ? (
						<div className="space-y-1.5">
							<label
								htmlFor="circle-pick"
								className="block text-xs text-text-faint"
							>
								Which circle?
							</label>
							<select
								id="circle-pick"
								value={circleId ?? ""}
								onChange={(e) => patch({ circleId: e.target.value })}
								className="h-10 w-full max-w-sm rounded-lg bg-raised px-3 text-sm text-text ring-1 ring-line-strong outline-none focus-visible:ring-2 focus-visible:ring-gold"
							>
								{circles.map((c) => (
									<option key={c.id} value={c.id}>
										{c.name} ({c.memberCount}{" "}
										{c.memberCount === 1 ? "person" : "people"})
									</option>
								))}
							</select>
						</div>
					) : (
						<div className="space-y-2">
							<label htmlFor="circle-new" className="text-sm font-medium">
								Start a family circle
							</label>
							<p className="text-sm text-text-soft">
								Give it a name, then invite family with a code from the Family
								page.
							</p>
							<div className="flex flex-wrap gap-2">
								<Input
									id="circle-new"
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									placeholder="The Jansen family"
									className="max-w-xs"
									maxLength={60}
								/>
								<Button
									type="button"
									variant="secondary"
									onClick={start}
									disabled={busy || !newName.trim()}
								>
									Create circle
								</Button>
							</div>
						</div>
					)}
				</div>
			)}

			<div className="flex flex-wrap gap-3">
				<Button
					variant="gold"
					disabled={!ready || saving}
					onClick={() => onSave(circleId)}
				>
					{saving ? "Saving…" : "Save memory"}
				</Button>
				<Button variant="ghost" onClick={onBack} disabled={saving}>
					Back
				</Button>
			</div>
		</div>
	);
}
