import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MicIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { Page, TellerChip } from "#/components/app-shell";
import { requireSignedIn } from "#/components/home/auth";
import { StoryCard } from "#/components/story-card";
import { StoryMap } from "#/components/story-map";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { formatDuration } from "#/lib/decades";
import { mapStoriesQuery, myStorytellersQuery } from "#/lib/queries";
import { listMyStories } from "#/server/fns/stories";

const myStoriesQuery = {
	queryKey: ["my-stories"],
	queryFn: () => listMyStories(),
};

export const Route = createFileRoute("/archive")({
	beforeLoad: ({ context }) => requireSignedIn(context.queryClient, "/archive"),
	head: () => ({ meta: [{ title: "Your archive | Hereabouts" }] }),
	component: ArchivePage,
});

type Filter = "all" | "private" | "circle" | "public";

function Stat({ label, value }: { label: string; value: string | number }) {
	return (
		<div>
			<div className="text-xs text-text-faint">{label}</div>
			<div className="numerals text-xl text-text">{value}</div>
		</div>
	);
}

function ArchivePage() {
	const tellers = useQuery(myStorytellersQuery);
	const stories = useQuery(myStoriesQuery);
	const list = stories.data ?? [];
	const [filter, setFilter] = useState<Filter>("all");

	const count = (f: Filter) =>
		f === "all" ? list.length : list.filter((s) => s.visibility === f).length;
	const shown =
		filter === "all" ? list : list.filter((s) => s.visibility === filter);
	const totalMs = list.reduce((a, s) => a + (s.durationMs ?? 0), 0);
	const decades = new Set(list.map((s) => s.decade)).size;

	return (
		<Page className="space-y-8">
			<header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
				<div className="space-y-4">
					<h1 className="text-2xl font-semibold tracking-tight">
						Your archive
					</h1>
					<div className="flex flex-wrap gap-x-8 gap-y-3">
						<Stat label="Memories" value={list.length} />
						<Stat label="Storytellers" value={tellers.data?.length ?? 0} />
						<Stat
							label="Listening time"
							value={formatDuration(totalMs) || "0:00"}
						/>
						<Stat label="Decades covered" value={decades} />
					</div>
				</div>
				{list.length > 0 && (
					<Button asChild variant="gold">
						<Link to="/record">
							<MicIcon />
							Record a memory
						</Link>
					</Button>
				)}
			</header>

			<section aria-labelledby="tellers" className="space-y-3">
				<h2 id="tellers" className="text-lg font-semibold">
					Storytellers
				</h2>
				{tellers.isPending ? (
					<Skeleton className="h-20 w-full rounded-xl" />
				) : (
					<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{tellers.data?.map((t) => (
							<li key={t.id}>
								<Link
									to="/people/$tellerId"
									params={{ tellerId: t.id }}
									className="flex items-center gap-3 rounded-xl border border-line bg-panel p-3.5 outline-none transition-colors hover:border-line-strong hover:bg-raised focus-visible:ring-2 focus-visible:ring-gold"
								>
									<TellerChip name={t.name} className="size-10 text-sm" />
									<span className="min-w-0 flex-1">
										<span className="block truncate text-sm font-semibold">
											{t.name}
										</span>
										<span className="block truncate text-[0.8125rem] text-text-soft">
											{t.relation ?? "Storyteller"}
										</span>
									</span>
									<span className="text-right">
										<span className="numerals block text-sm">
											{t.storyCount}
										</span>
										<span className="block text-xs text-text-faint">
											{t.storyCount === 1 ? "memory" : "memories"}
										</span>
									</span>
								</Link>
							</li>
						))}
						<li>
							<Link
								to="/record"
								className="flex h-full min-h-[4.5rem] items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong p-3.5 text-sm font-medium text-text-soft outline-none transition-colors hover:border-gold-line hover:text-text focus-visible:ring-2 focus-visible:ring-gold"
							>
								<PlusIcon className="size-4" />
								Add someone
							</Link>
						</li>
					</ul>
				)}
			</section>

			<section aria-labelledby="memories" className="space-y-4">
				<h2 id="memories" className="sr-only">
					Your memories
				</h2>
				{stories.isPending ? (
					<Skeleton className="h-40 w-full rounded-xl" />
				) : list.length === 0 ? (
					<div className="panel flex flex-col items-start gap-3 p-6 sm:p-8">
						<p className="text-lg font-semibold">No memories yet</p>
						<p className="max-w-prose text-text-soft">
							Sit down with someone who remembers your street and press record.
						</p>
						<Button asChild variant="gold">
							<Link to="/record">
								<MicIcon />
								Record your first memory
							</Link>
						</Button>
					</div>
				) : (
					<>
						<Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
							<TabsList variant="line">
								{(
									[
										["all", "All"],
										["private", "Just me"],
										["circle", "Family"],
										["public", "Public"],
									] as const
								).map(([v, label]) => (
									<TabsTrigger key={v} value={v}>
										{label}
										<span className="numerals text-xs text-text-faint">
											{count(v)}
										</span>
									</TabsTrigger>
								))}
							</TabsList>
						</Tabs>
						{shown.length === 0 ? (
							<p className="py-6 text-sm text-text-soft">Nothing here yet.</p>
						) : (
							<ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
								{shown.map((s) => (
									<li key={s.id} className="flex min-w-0">
										<StoryCard
											story={s}
											showVisibility
											className="w-full min-w-0"
										/>
									</li>
								))}
							</ul>
						)}
						<MyMap />
					</>
				)}
			</section>
		</Page>
	);
}

function MyMap() {
	const { data } = useQuery(mapStoriesQuery("mine"));
	if (!data || data.length === 0) return null;
	return (
		<div className="panel overflow-hidden p-1.5">
			<StoryMap
				pins={data}
				fitPins
				interactive
				className="h-56 rounded-xl sm:h-72"
			/>
		</div>
	);
}
