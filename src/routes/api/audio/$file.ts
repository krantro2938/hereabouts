import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { canView } from "#/server/access";
import { serveAudio } from "#/server/audio";
import { currentUser } from "#/server/auth";
import { db } from "#/server/db";
import { stories } from "#/server/schema";

/**
 * GET /api/audio/{file} — streams a recording (Range-capable), but only to people who
 * may see the story it belongs to. A recording not yet attached to a story (mid-flow
 * review) is only served to signed-in users; file names are unguessable.
 */
export const Route = createFileRoute("/api/audio/$file")({
	server: {
		handlers: {
			GET: async ({ params, request }) => {
				const file = params.file.replace(/_(webm|ogg|m4a|mp3|wav)$/, ".$1"); // see lib/audio.ts
				const user = currentUser();
				const story = db()
					.select()
					.from(stories)
					.where(eq(stories.audioFile, file))
					.get();
				if (story ? !canView(user, story) : !user)
					return new Response("Not found", { status: 404 });
				return serveAudio(file, request);
			},
		},
	},
});
