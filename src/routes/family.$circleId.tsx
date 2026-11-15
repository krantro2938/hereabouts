import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Page, TellerChip } from "#/components/app-shell";
import { errorMessage, requireSignedIn } from "#/components/home/auth";
import { InviteCode } from "#/components/people/invite";
import { StoryCard } from "#/components/story-card";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { getCircle, leaveCircle } from "#/server/fns/people";

export const Route = createFileRoute("/family/$circleId")({
	beforeLoad: ({ context, params }) =>
		requireSignedIn(context.queryClient, `/family/${params.circleId}`),
	head: () => ({ meta: [{ title: "Family circle | Hereabouts" }] }),
	component: CirclePage,
});

function CirclePage() {
	const { circleId } = Route.useParams();
	const qc = useQueryClient();
	const router = useRouter();
	const { data, isPending } = useQuery({
		queryKey: ["circle", circleId],
		queryFn: () => getCircle({ data: { id: circleId } }),
	});
	const leave = useMutation({
		mutationFn: () => leaveCircle({ data: { id: circleId } }),
		onSuccess: async () => {
			await qc.invalidateQueries({ queryKey: ["circles"] });
			await router.navigate({ to: "/family" });
		},
		onError: (e) => toast(errorMessage(e)),
	});

	if (isPending)
		return (
			<Page>
				<Skeleton className="h-16 w-2/3 rounded-xl" />
			</Page>
		);
	if (!data)
		return (
			<Page>
				<div className="panel p-6">
					<p className="text-lg font-semibold">
						This circle isn’t yours to see
					</p>
					<p className="mt-1 max-w-prose text-text-soft">
						It may not exist, or you may not be a member. Ask whoever runs it
						for an invite link.
					</p>
					<Button asChild variant="outline" className="mt-4">
						<Link to="/family">Back to your circles</Link>
					</Button>
				</div>
			</Page>
		);

	const { circle, members, stories } = data;
	return (
		<Page className="space-y-8">
			<header>
				<Link
					to="/family"
					className="rounded text-sm text-text-soft outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-gold"
				>
					All circles
				</Link>
				<h1 className="mt-2 text-2xl font-semibold tracking-tight">
					{circle.name}
				</h1>
				<p className="mt-1.5 text-text-soft">
					Stories shared here are only heard by the people below.
				</p>
			</header>

			<section aria-labelledby="members" className="panel space-y-4 p-5">
				<h2 id="members" className="text-lg font-semibold">
					Members
				</h2>
				<ul className="flex flex-wrap gap-x-6 gap-y-3">
					{members.map((m) => (
						<li key={m.id} className="flex items-center gap-2.5">
							<TellerChip name={m.name} className="size-9 text-xs" />
							<span className="text-sm font-medium">{m.name}</span>
						</li>
					))}
				</ul>
				<div className="border-t border-line pt-4">
					<InviteCode code={circle.inviteCode} />
				</div>
			</section>

			<section aria-labelledby="stories" className="space-y-4">
				<h2 id="stories" className="text-lg font-semibold">
					Stories in this circle
				</h2>
				{stories.length === 0 ? (
					<div className="panel p-6">
						<p className="font-semibold">Nothing shared yet</p>
						<p className="mt-1 max-w-prose text-text-soft">
							Record a memory and choose “Family circle” when it asks who can
							hear it.
						</p>
						<Button asChild variant="gold" className="mt-4">
							<Link to="/record">Record a memory</Link>
						</Button>
					</div>
				) : (
					<ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
						{stories.map((s) => (
							<li key={s.id} className="flex min-w-0">
								<StoryCard
									story={{ ...s, visibility: "circle" }}
									showVisibility
									className="w-full min-w-0"
								/>
							</li>
						))}
					</ul>
				)}
			</section>

			<section>
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button variant="outline">Leave circle</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Leave {circle.name}?</AlertDialogTitle>
							<AlertDialogDescription>
								You will stop hearing the stories shared here. You can rejoin
								later with the invite code.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Stay</AlertDialogCancel>
							<AlertDialogAction
								variant="destructive"
								onClick={() => leave.mutate()}
							>
								Leave circle
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</section>
		</Page>
	);
}
