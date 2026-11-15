import { createReadStream, mkdirSync, statSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Readable } from "node:stream";
import { nanoid } from "nanoid";

export const MAX_PHOTO_BYTES = 12 * 1024 * 1024;

const MIME: Record<string, string> = {
	jpg: "image/jpeg",
	png: "image/png",
	webp: "image/webp",
};

export function photoDir() {
	const dir = resolve(process.env.PHOTO_DIR ?? "./data/photos");
	mkdirSync(dir, { recursive: true });
	return dir;
}

/** Identify jpeg/png/webp from magic bytes (never trust the client's content type). */
export function sniffImage(b: Uint8Array): "jpg" | "png" | "webp" | null {
	if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
		return "jpg";
	if (
		b.length > 8 &&
		b[0] === 0x89 &&
		b[1] === 0x50 &&
		b[2] === 0x4e &&
		b[3] === 0x47
	)
		return "png";
	if (
		b.length > 12 &&
		String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
		String.fromCharCode(...b.slice(8, 12)) === "WEBP"
	)
		return "webp";
	return null;
}

export async function savePhoto(
	blob: Blob,
): Promise<{ file: string } | { error: string; status: number }> {
	if (blob.size === 0) return { error: "No photo received.", status: 400 };
	if (blob.size > MAX_PHOTO_BYTES)
		return { error: "Photos can be up to 12 MB.", status: 413 };
	const bytes = new Uint8Array(await blob.arrayBuffer());
	const ext = sniffImage(bytes);
	if (!ext)
		return { error: "Please choose a JPEG, PNG or WebP photo.", status: 415 };
	const file = `${nanoid(16)}.${ext}`;
	await writeFile(join(photoDir(), file), bytes);
	return { file };
}

export function servePhoto(file: string): Response {
	if (!/^[\w-]+\.(jpg|png|webp)$/.test(file))
		return new Response("Not found", { status: 404 });
	const path = join(photoDir(), file);
	let size: number;
	try {
		size = statSync(path).size;
	} catch {
		return new Response("Not found", { status: 404 });
	}
	const stream = Readable.toWeb(createReadStream(path)) as ReadableStream;
	return new Response(stream, {
		headers: {
			"Content-Type": MIME[file.split(".").pop() ?? ""] ?? "image/jpeg",
			"Content-Length": String(size),
			"Cache-Control": "public, max-age=31536000, immutable",
			"X-Content-Type-Options": "nosniff",
		},
	});
}
