import { createFileRoute } from "@tanstack/react-router";
import { currentUser } from "#/server/auth";
import { savePhoto } from "#/server/photos";

/** POST /api/photos — multipart `photo` (jpeg/png/webp, up to 12 MB). Returns { file }. */
export const Route = createFileRoute("/api/photos/")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				if (!currentUser())
					return Response.json(
						{ error: "Sign in to add a photo." },
						{ status: 401 },
					);
				const form = await request.formData();
				const photo = form.get("photo");
				if (!(photo instanceof Blob))
					return Response.json(
						{ error: "No photo received." },
						{ status: 400 },
					);
				const saved = await savePhoto(photo);
				if ("error" in saved)
					return Response.json(
						{ error: saved.error },
						{ status: saved.status },
					);
				return Response.json({ file: saved.file });
			},
		},
	},
});
