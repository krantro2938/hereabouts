import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Page } from "#/components/app-shell";
import { errorMessage, FormError } from "#/components/home/auth";
import { Button } from "#/components/ui/button";
import { meQuery } from "#/lib/queries";
import { joinCircle } from "#/server/fns/people";

export const Route = createFileRoute("/join/$code")({
	head: () => ({ meta: [{ title: "Join a family circle | Hereabouts" }] }),
	component: JoinPage,
});

function JoinPage() {
	const { code } = Route.useParams();
	const { data: me, isPending } = useQuery(meQuery);
	const qc = useQueryClient();
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const back = `/join/${code}`;

	const join = useMutation({
		mutationFn: () => joinCircle({ data: { code } }),
		onSuccess: async (c) => {
			await qc.invalidateQueries({ queryKey: ["circles"] });
			await router.navigate({
				to: "/family/$circleId",
				params: { circleId: c.id },
			});
		},
		onError: (e) => setError(errorMessage(e)),
	});

	return (
		<Page>
			<div className="panel mx-auto mt-8 max-w-md space-y-5 p-6 text-center sm:p-8">
				<div>
					<div className="text-xs text-text-faint">Invite code</div>
					<div className="numerals mt-1 text-lg tracking-[0.08em]">{code}</div>
				</div>
				<h1 className="text-2xl font-semibold tracking-tight">
					You’ve been invited to a family circle
				</h1>
				<p className="text-text-soft">
					A circle is a small, private group. The stories its members share are
					heard only by each other: grandparents’ voices, kept in the family.
				</p>
				{isPending ? null : me ? (
					<div className="space-y-3">
						<p className="text-sm text-text-soft">
							You’re signed in as{" "}
							<span className="font-medium text-text">{me.name}</span>.
						</p>
						<FormError message={error} />
						<Button
							variant="gold"
							onClick={() => join.mutate()}
							disabled={join.isPending}
						>
							Join circle
						</Button>
					</div>
				) : (
					<div className="flex flex-wrap justify-center gap-3">
						<Button asChild variant="gold">
							<Link to="/signup" search={{ redirect: back }}>
								Create an account
							</Link>
						</Button>
						<Button asChild variant="outline">
							<Link to="/signin" search={{ redirect: back }}>
								Sign in
							</Link>
						</Button>
					</div>
				)}
			</div>
		</Page>
	);
}
