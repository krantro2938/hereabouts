import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { canView } from "#/server/access";
import { currentUser } from "#/server/auth";
import { db } from "#/server/db";
import { servePhoto } from "#/server/photos";
import { stories } from "#/server/schema";

/**
 * GET /api/photos/{file} — serves a place photo to whoever may see the story it belongs to.
 * Sample/public stories' photos are public; a photo not yet attached to a story
 * (mid-flow upload) is only served to signed-in users; file names are unguessable.
 */
export const Route = createFileRoute("/api/photos/$file")({
	server: {
		handlers: {
			GET: ({ params }) => {
				const file = params.file.replace(/_(jpe?g|png|webp)$/, ".$1"); // see lib/photo.ts
				const user = currentUser();
				const story = db()
					.select()
					.from(stories)
					.where(eq(stories.photoFile, file))
					.get();
				if (story ? !canView(user, story) : !user)
					return new Response("Not found", { status: 404 });
				return servePhoto(file);
			},
		},
	},
});
