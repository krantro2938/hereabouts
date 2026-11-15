import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	notFound,
	useRouter,
} from "@tanstack/react-router";
import { MicIcon, PencilIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Page, TellerChip } from "#/components/app-shell";
import { storytellerQuery } from "#/components/explore/queries";
import { StoryCard } from "#/components/story-card";
import { StoryMap } from "#/components/story-map";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { updateStoryteller } from "#/server/fns/people";

export const Route = createFileRoute("/people/$tellerId")({
	loader: async ({ context, params }) => {
		const data = await context.queryClient.ensureQueryData(
			storytellerQuery(params.tellerId),
		);
		if (!data) throw notFound();
		return { name: data.storyteller.name };
	},
	head: ({ loaderData }) => ({
		meta: [
			{ title: loaderData ? `${loaderData.name} | Hereabouts` : "Hereabouts" },
		],
	}),
	component: TellerPage,
});

function TellerPage() {
	const { tellerId } = Route.useParams();
	const { data } = useQuery(storytellerQuery(tellerId));
	const pins = useMemo(
		() =>
			(data?.stories ?? []).map((s) => ({
				id: s.id,
				lat: s.lat,
				lng: s.lng,
				decade: s.decade,
				title: s.title,
			})),
		[data],
	);
	if (!data) return null;
	const { storyteller: t, stories, isOwner } = data;
	const first = t.name.split(" ")[0];
	const decades = stories.map((s) => s.decade);
	const span =
		decades.length === 0
			? ""
			: Math.min(...decades) === Math.max(...decades)
				? `${Math.min(...decades)}s`
				: `${Math.min(...decades)}s to ${Math.max(...decades)}s`;
	const facts = [
		t.relation ? { label: "Relation", value: t.relation } : null,
		t.bornYear ? { label: "Born", value: String(t.bornYear) } : null,
		{ label: "Memories", value: String(stories.length) },
		span ? { label: "Years covered", value: span } : null,
	].filter((f): f is { label: string; value: string } => !!f);

	return (
		<Page className="max-w-6xl">
			<header className="flex flex-col gap-6 sm:flex-row sm:items-start">
				<TellerChip
					name={t.name}
					className="size-20 text-2xl ring-line-strong"
				/>
				<div className="min-w-0 flex-1">
					<h1 className="text-2xl font-semibold tracking-tight">{t.name}</h1>
					<dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
						{facts.map((f) => (
							<div key={f.label}>
								<dt className="text-xs text-text-faint">{f.label}</dt>
								<dd className="numerals text-sm font-medium text-text">
									{f.value}
								</dd>
							</div>
						))}
					</dl>
					{t.bio && (
						<p className="prose-story mt-5 text-[1.0625rem]">{t.bio}</p>
					)}
					{isOwner && (
						<div className="mt-5 flex flex-wrap gap-3">
							<Button asChild variant="gold">
								<Link to="/record" search={{ storyteller: t.id } as never}>
									<MicIcon />
									Record another memory with {first}
								</Link>
							</Button>
							<EditTeller teller={t} />
						</div>
					)}
				</div>
			</header>

			{pins.length > 0 && (
				<StoryMap
					className="mt-8 h-[280px] rounded-2xl ring-1 ring-line-strong"
					pins={pins}
					fitPins
					center={
						pins.length === 1
							? { lat: pins[0].lat, lng: pins[0].lng }
							: undefined
					}
					zoom={pins.length === 1 ? 15 : undefined}
				/>
			)}

			<section className="mt-10">
				<h2 className="text-lg font-semibold tracking-tight">
					{first}’s life, in memories
				</h2>
				{stories.length === 0 ? (
					<p className="mt-3 text-sm text-text-soft">
						Nothing recorded yet. Sit down with {first} and press record; the
						first memory will start this timeline.
					</p>
				) : (
					<ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
						{stories.map((s) => (
							<li key={s.id} className="flex">
								<StoryCard
									className="w-full"
									showVisibility={isOwner}
									story={{ ...s, storytellerName: t.name }}
								/>
							</li>
						))}
					</ul>
				)}
			</section>
		</Page>
	);
}

function EditTeller({
	teller,
}: {
	teller: {
		id: string;
		name: string;
		relation: string | null;
		bornYear: number | null;
		bio: string | null;
	};
}) {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState(teller.name);
	const [relation, setRelation] = useState(teller.relation ?? "");
	const [born, setBorn] = useState(
		teller.bornYear ? String(teller.bornYear) : "",
	);
	const [bio, setBio] = useState(teller.bio ?? "");
	const [busy, setBusy] = useState(false);
	const qc = useQueryClient();
	const router = useRouter();

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="secondary">
					<PencilIcon />
					Edit details
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit details</DialogTitle>
					<DialogDescription>
						How this person is introduced on their page and in their stories.
					</DialogDescription>
				</DialogHeader>
				<form
					className="grid gap-4"
					onSubmit={async (e) => {
						e.preventDefault();
						setBusy(true);
						try {
							await updateStoryteller({
								data: {
									id: teller.id,
									name,
									relation: relation.trim() || null,
									bornYear: born.trim() ? Number(born) : null,
									bio: bio.trim() || null,
								},
							});
							await qc.invalidateQueries();
							await router.invalidate();
							toast.success("Details saved.");
							setOpen(false);
						} catch (err) {
							toast.error(
								err instanceof Error
									? err.message
									: "Couldn’t save. Check the details and try again.",
							);
						} finally {
							setBusy(false);
						}
					}}
				>
					<div className="grid gap-1.5">
						<Label htmlFor="t-name">Name</Label>
						<Input
							id="t-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
							maxLength={80}
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="grid gap-1.5">
							<Label htmlFor="t-rel">Relation</Label>
							<Input
								id="t-rel"
								value={relation}
								onChange={(e) => setRelation(e.target.value)}
								placeholder="my grandmother"
							/>
						</div>
						<div className="grid gap-1.5">
							<Label htmlFor="t-born">Born in</Label>
							<Input
								id="t-born"
								inputMode="numeric"
								value={born}
								onChange={(e) => setBorn(e.target.value)}
								placeholder="1941"
							/>
						</div>
					</div>
					<div className="grid gap-1.5">
						<Label htmlFor="t-bio">A few words about them</Label>
						<Textarea
							id="t-bio"
							value={bio}
							onChange={(e) => setBio(e.target.value)}
							rows={4}
							maxLength={600}
						/>
					</div>
					<DialogFooter>
						<Button type="submit" disabled={busy}>
							{busy ? "Saving" : "Save details"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
