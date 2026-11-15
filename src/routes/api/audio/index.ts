import { createFileRoute } from "@tanstack/react-router";
import { transcribe } from "#/server/ai";
import { saveAudio } from "#/server/audio";
import { currentUser } from "#/server/auth";

/**
 * POST /api/audio — multipart `audio` (+ optional `language`).
 * Stores the recording and returns its transcript (null when speech-to-text is unavailable).
 * With `preview=1` the audio is only transcribed, not stored — used mid-interview to
 * suggest the next question from what has been said so far.
 */
export const Route = createFileRoute("/api/audio/")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				if (!currentUser())
					return Response.json(
						{ error: "Sign in to record." },
						{ status: 401 },
					);
				const form = await request.formData();
				const audio = form.get("audio");
				if (!(audio instanceof Blob) || audio.size === 0)
					return Response.json(
						{ error: "No recording received." },
						{ status: 400 },
					);
				if (audio.size > 60 * 1024 * 1024)
					return Response.json(
						{ error: "Recordings can be up to about 45 minutes." },
						{ status: 413 },
					);
				const language =
					typeof form.get("language") === "string"
						? (form.get("language") as string)
						: undefined;
				if (form.get("preview") === "1") {
					const t = await transcribe(
						audio,
						"preview.webm",
						language || undefined,
					);
					return Response.json({
						audioFile: null,
						audioMime: null,
						transcript: t?.text ?? null,
						language: t?.language ?? null,
					});
				}
				const saved = await saveAudio(audio);
				const t = await transcribe(audio, saved.file, language || undefined);
				return Response.json({
					audioFile: saved.file,
					audioMime: saved.mime,
					transcript: t?.text ?? null,
					language: t?.language ?? null,
				});
			},
		},
	},
});
