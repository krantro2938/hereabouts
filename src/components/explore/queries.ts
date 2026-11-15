import { queryOptions } from "@tanstack/react-query";
import { getStoryteller } from "#/server/fns/people";
import { getStory } from "#/server/fns/stories";

export const storyQuery = (id: string) =>
	queryOptions({
		queryKey: ["story", id],
		queryFn: () => getStory({ data: { id } }),
	});

export const storytellerQuery = (id: string) =>
	queryOptions({
		queryKey: ["storyteller", id],
		queryFn: () => getStoryteller({ data: { id } }),
	});

/** Paragraphs of a story body, split on blank lines. */
export function paragraphs(text: string): string[] {
	return text
		.split(/\n\s*\n/)
		.map((p) => p.trim())
		.filter(Boolean);
}
