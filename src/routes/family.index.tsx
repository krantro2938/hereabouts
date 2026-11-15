import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Page, TellerChip } from "#/components/app-shell";
import {
	errorMessage,
	FormError,
	requireSignedIn,
} from "#/components/home/auth";
import { InviteCode } from "#/components/people/invite";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Skeleton } from "#/components/ui/skeleton";
import { myCirclesQuery } from "#/lib/queries";
import { createCircle, getCircle, joinCircle } from "#/server/fns/people";

export const Route = createFileRoute("/family/")({
	beforeLoad: ({ context }) => requireSignedIn(context.queryClient, "/family"),
	head: () => ({ meta: [{ title: "Family circles | Hereabouts" }] }),
	component: FamilyPage,
});

function FamilyPage() {
	const { data, isPending } = useQuery(myCirclesQuery);
	const qc = useQueryClient();
	const router = useRouter();
	const [createError, setCreateError] = useState<string | null>(null);
	const [joinError, setJoinError] = useState<string | null>(null);

	const create = useMutation({
		mutationFn: (name: string) => createCircle({ data: { name } }),
		onSuccess: async (c) => {
			await qc.invalidateQueries({ queryKey: ["circles"] });
			toast(`“${c.name}” is ready. Share its invite link.`);
		},
		onError: (e) => setCreateError(errorMessage(e)),
	});
	const join = useMutation({
		mutationFn: (code: string) => joinCircle({ data: { code } }),
		onSuccess: async (c) => {
			await qc.invalidateQueries({ queryKey: ["circles"] });
			await router.navigate({
				to: "/family/$circleId",
				params: { circleId: c.id },
			});
		},
		onError: (e) => setJoinError(errorMessage(e)),
	});

	return (
		<Page className="space-y-8">
			<header>
				<h1 className="text-2xl font-semibold tracking-tight">
					Family circles
				</h1>
				<p className="mt-1.5 max-w-prose text-text-soft">
					Stories you share with a circle are only heard by its members.
				</p>
			</header>

			<section aria-label="Your circles">
				{isPending ? (
					<Skeleton className="h-40 w-full rounded-xl" />
				) : (data ?? []).length === 0 ? (
					<div className="panel p-6">
						<p className="text-lg font-semibold">No circles yet</p>
						<p className="mt-1 max-w-prose text-text-soft">
							A circle is the people you would want to hear a grandmother’s
							story: your cousins, your parents, your siblings. Start one below,
							or join one with a code.
						</p>
					</div>
				) : (
					<ul className="grid gap-4 md:grid-cols-2">
						{data?.map((c) => (
							<CircleCard key={c.id} c={c} />
						))}
					</ul>
				)}
			</section>

			<div className="grid gap-4 md:grid-cols-2">
				<section aria-labelledby="new-circle" className="panel p-5">
					<h2 id="new-circle" className="text-lg font-semibold">
						Start a circle
					</h2>
					<form
						className="mt-4 space-y-3"
						onSubmit={(e) => {
							e.preventDefault();
							setCreateError(null);
							const form = e.currentTarget;
							const name = String(new FormData(form).get("name") ?? "");
							create.mutate(name, { onSuccess: () => form.reset() });
						}}
					>
						<Label htmlFor="circle-name" className="text-xs text-text-faint">
							Circle name
						</Label>
						<Input
							id="circle-name"
							name="name"
							placeholder="The Janssen family"
							required
						/>
						<FormError message={createError} />
						<Button
							type="submit"
							variant="secondary"
							disabled={create.isPending}
						>
							Create circle
						</Button>
					</form>
				</section>
				<section aria-labelledby="join-circle" className="panel p-5">
					<h2 id="join-circle" className="text-lg font-semibold">
						Join with a code
					</h2>
					<form
						className="mt-4 space-y-3"
						onSubmit={(e) => {
							e.preventDefault();
							setJoinError(null);
							join.mutate(
								String(new FormData(e.currentTarget).get("code") ?? ""),
							);
						}}
					>
						<Label htmlFor="code" className="text-xs text-text-faint">
							Invite code
						</Label>
						<Input
							id="code"
							name="code"
							placeholder="K7M2QX"
							autoCapitalize="characters"
							required
							className="uppercase"
						/>
						<FormError message={joinError} />
						<Button type="submit" variant="secondary" disabled={join.isPending}>
							Join circle
						</Button>
					</form>
				</section>
			</div>
		</Page>
	);
}

type CircleRow = NonNullable<ReturnType<typeof useCircles>["data"]>[number];
function useCircles() {
	return useQuery(myCirclesQuery);
}

function CircleCard({ c }: { c: CircleRow }) {
	const detail = useQuery({
		queryKey: ["circle", c.id],
		queryFn: () => getCircle({ data: { id: c.id } }),
	});
	const members = detail.data?.members ?? [];
	return (
		<li className="panel flex flex-col gap-4 p-5">
			<div className="flex items-start justify-between gap-3">
				<h2 className="text-lg font-semibold">
					<Link
						to="/family/$circleId"
						params={{ circleId: c.id }}
						className="rounded outline-none hover:text-gold focus-visible:ring-2 focus-visible:ring-gold"
					>
						{c.name}
					</Link>
				</h2>
				<Button
					asChild
					variant="outline"
					size="icon-sm"
					aria-label={`Open ${c.name}`}
				>
					<Link to="/family/$circleId" params={{ circleId: c.id }}>
						<ArrowRightIcon />
					</Link>
				</Button>
			</div>
			<div className="flex items-end gap-8">
				<div>
					<div className="text-xs text-text-faint">Members</div>
					<div className="mt-1 flex -space-x-1.5">
						{members.slice(0, 5).map((m) => (
							<TellerChip
								key={m.id}
								name={m.name}
								className="size-7 bg-panel"
							/>
						))}
						{members.length === 0 && (
							<span className="numerals text-sm">{c.memberCount}</span>
						)}
					</div>
				</div>
				<div>
					<div className="text-xs text-text-faint">Stories</div>
					<div className="numerals mt-1 text-sm">{c.storyCount}</div>
				</div>
			</div>
			<InviteCode code={c.inviteCode} />
		</li>
	);
}
