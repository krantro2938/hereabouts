import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { initials } from "#/components/app-shell";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Skeleton } from "#/components/ui/skeleton";
import { myStorytellersQuery } from "#/lib/queries";
import { cn } from "#/lib/utils";
import { createStoryteller } from "#/server/fns/people";

export function StepTeller({
	value,
	onChange,
	onNext,
}: {
	value: string | null;
	onChange: (id: string) => void;
	onNext: () => void;
}) {
	const qc = useQueryClient();
	const { data: tellers, isLoading } = useQuery(myStorytellersQuery);
	const [adding, setAdding] = useState(false);
	const [name, setName] = useState("");
	const [relation, setRelation] = useState("");
	const [born, setBorn] = useState("");
	const [busy, setBusy] = useState(false);
	const showForm = adding || (tellers && tellers.length === 0);

	const create = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		const bornYear = born ? Number(born) : null;
		if (bornYear != null && (bornYear < 1900 || bornYear > 2020)) {
			toast("Year born should be between 1900 and 2020.");
			return;
		}
		setBusy(true);
		try {
			const t = await createStoryteller({
				data: { name, relation: relation.trim() || null, bornYear, bio: null },
			});
			await qc.invalidateQueries({ queryKey: myStorytellersQuery.queryKey });
			onChange(t.id);
			setAdding(false);
			setName("");
			setRelation("");
			setBorn("");
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="mx-auto max-w-3xl space-y-6">
			<div>
				<h2 className="text-2xl font-semibold tracking-tight">
					Who’s telling the story?
				</h2>
				<p className="mt-1.5 text-text-soft">
					Pick the person you’re sitting with, or add someone new.
				</p>
			</div>

			{isLoading ? (
				<div className="space-y-3">
					<Skeleton className="h-20 w-full rounded-xl" />
					<Skeleton className="h-20 w-full rounded-xl" />
				</div>
			) : (
				tellers &&
				tellers.length > 0 && (
					<div
						role="radiogroup"
						aria-label="Storyteller"
						className="grid gap-3 sm:grid-cols-2"
					>
						{tellers.map((t) => {
							const on = value === t.id;
							return (
								// biome-ignore lint/a11y/useSemanticElements: big custom radio card
								<button
									key={t.id}
									type="button"
									role="radio"
									aria-checked={on}
									onClick={() => onChange(t.id)}
									className={cn(
										"flex min-h-20 w-full items-center gap-3.5 rounded-xl border border-line bg-panel px-4 py-3 text-left outline-none transition-colors hover:border-line-strong focus-visible:ring-2 focus-visible:ring-gold",
										on && "border-gold-line bg-gold-tint ring-1 ring-gold",
									)}
								>
									<span
										className={cn(
											"grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold text-text-soft ring-1 ring-line-strong ring-inset",
											on && "bg-gold text-gold-ink ring-gold",
										)}
									>
										{initials(t.name)}
									</span>
									<span className="min-w-0 flex-1">
										<span className="block truncate font-semibold text-text">
											{t.name}
										</span>
										<span className="block truncate text-[0.8125rem] text-text-soft">
											{[
												t.relation,
												`${t.storyCount} ${t.storyCount === 1 ? "memory" : "memories"}`,
											]
												.filter(Boolean)
												.join(", ")}
										</span>
									</span>
									{on && (
										<CheckIcon
											className="size-5 shrink-0 text-gold"
											aria-hidden
										/>
									)}
								</button>
							);
						})}
					</div>
				)
			)}

			{showForm ? (
				<form onSubmit={create} className="panel space-y-4 p-5 sm:p-6">
					<h3 className="text-lg font-semibold">Someone new</h3>
					<div className="space-y-1.5">
						<Label htmlFor="st-name">Name</Label>
						<Input
							id="st-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
							maxLength={80}
							autoComplete="off"
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="st-rel">How you know them</Label>
						<Input
							id="st-rel"
							value={relation}
							onChange={(e) => setRelation(e.target.value)}
							placeholder="my grandmother"
							maxLength={80}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="st-born">Year born (optional)</Label>
						<Input
							id="st-born"
							type="number"
							inputMode="numeric"
							min={1900}
							max={2020}
							value={born}
							onChange={(e) => setBorn(e.target.value)}
							placeholder="1941"
							className="max-w-40"
						/>
					</div>
					<div className="flex flex-wrap gap-3">
						<Button
							type="submit"
							variant="secondary"
							disabled={busy || !name.trim()}
						>
							Add storyteller
						</Button>
						{tellers && tellers.length > 0 && (
							<Button
								type="button"
								variant="ghost"
								onClick={() => setAdding(false)}
							>
								Cancel
							</Button>
						)}
					</div>
				</form>
			) : (
				<Button type="button" variant="outline" onClick={() => setAdding(true)}>
					<PlusIcon />
					Someone new
				</Button>
			)}

			<div>
				<Button variant="gold" disabled={!value} onClick={onNext}>
					Continue
				</Button>
			</div>
		</div>
	);
}
