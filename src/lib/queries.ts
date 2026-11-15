import { queryOptions } from "@tanstack/react-query";
import { getMe } from "#/server/fns/auth";
import { listMyCircles, listMyStorytellers } from "#/server/fns/people";
import { decadeCounts, listMapStories } from "#/server/fns/stories";

export const meQuery = queryOptions({
	queryKey: ["me"],
	queryFn: () => getMe(),
	staleTime: 60_000,
});

export type MapScope = "everything" | "mine" | "family" | "public";
export const mapStoriesQuery = (scope: MapScope = "everything") =>
	queryOptions({
		queryKey: ["map-stories", scope],
		queryFn: () => listMapStories({ data: { scope } }),
	});

export const decadeCountsQuery = queryOptions({
	queryKey: ["decade-counts"],
	queryFn: () => decadeCounts(),
});
export const myStorytellersQuery = queryOptions({
	queryKey: ["storytellers"],
	queryFn: () => listMyStorytellers(),
});
export const myCirclesQuery = queryOptions({
	queryKey: ["circles"],
	queryFn: () => listMyCircles(),
});
