import { createReadStream, mkdirSync, statSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Readable } from "node:stream";
import { nanoid } from "nanoid";

const EXT: Record<string, string> = {
	"audio/webm": "webm",
	"audio/ogg": "ogg",
	"audio/mp4": "m4a",
	"audio/mpeg": "mp3",
	"audio/wav": "wav",
	"audio/x-wav": "wav",
};
const MIME: Record<string, string> = Object.fromEntries(
	Object.entries(EXT).map(([m, e]) => [e, m]),
);

export function audioDir() {
	const dir = resolve(process.env.AUDIO_DIR ?? "./data/audio");
	mkdirSync(dir, { recursive: true });
	return dir;
}

export async function saveAudio(
	blob: Blob,
): Promise<{ file: string; mime: string }> {
	const mime = (blob.type || "audio/webm").split(";")[0];
	const ext = EXT[mime] ?? "webm";
	const file = `${nanoid(16)}.${ext}`;
	await writeFile(
		join(audioDir(), file),
		Buffer.from(await blob.arrayBuffer()),
	);
	return { file, mime: MIME[ext] ?? mime };
}

/** Stream a stored recording with HTTP Range support so <audio> can seek. */
export function serveAudio(file: string, request: Request): Response {
	if (!/^[\w-]+\.(webm|ogg|m4a|mp3|wav)$/.test(file))
		return new Response("Not found", { status: 404 });
	const path = join(audioDir(), file);
	let size: number;
	try {
		size = statSync(path).size;
	} catch {
		return new Response("Not found", { status: 404 });
	}
	const type = MIME[file.split(".").pop() ?? ""] ?? "application/octet-stream";
	const range = request.headers.get("range");
	const base = {
		"Content-Type": type,
		"Accept-Ranges": "bytes",
		"Cache-Control": "private, max-age=86400",
	};
	if (range) {
		const m = range.match(/bytes=(\d*)-(\d*)/);
		const start = m?.[1] ? Number(m[1]) : 0;
		const end = m?.[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
		if (start >= size || start > end)
			return new Response(null, {
				status: 416,
				headers: { "Content-Range": `bytes */${size}` },
			});
		const stream = Readable.toWeb(
			createReadStream(path, { start, end }),
		) as ReadableStream;
		return new Response(stream, {
			status: 206,
			headers: {
				...base,
				"Content-Range": `bytes ${start}-${end}/${size}`,
				"Content-Length": String(end - start + 1),
			},
		});
	}
	const stream = Readable.toWeb(createReadStream(path)) as ReadableStream;
	return new Response(stream, {
		headers: { ...base, "Content-Length": String(size) },
	});
}
