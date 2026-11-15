/**
 * Fetch a properly licensed photograph of a sample story's place from Wikimedia Commons.
 * The chosen file title lives in seed-data.ts (`photo.title`) so the pick is reproducible.
 * Downloads the 1600px rendition into the photo dir (cached, like the audio) with a small
 * `.json` sidecar holding the credit line and the Commons page URL.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { photoDir } from "../src/server/photos";

const UA = "Hereabouts/0.1 (hackathon demo; contact via github)";
const API = "https://commons.wikimedia.org/w/api.php";
const OK_LICENCE = /^(public domain|cc0|cc[ -]by(-sa)?\b|pdm|attribution)/i;

export type FetchedPhoto = {
	file: string;
	credit: string;
	sourceUrl: string;
};

const strip = (html: string | undefined) =>
	(html ?? "")
		.replace(/<[^>]+>/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, '"')
		.replace(/&#0?39;/g, "’")
		.replace(/\s+/g, " ")
		.trim();

async function get(url: string, tries = 5): Promise<Response> {
	for (let i = 0; ; i++) {
		const res = await fetch(url, {
			headers: { "User-Agent": UA },
			signal: AbortSignal.timeout(60_000),
		});
		if (res.status !== 429 || i >= tries) return res;
		await new Promise((r) => setTimeout(r, 4000 * (i + 1)));
	}
}

function creditLine(title: string, meta: Record<string, { value?: string }>) {
	const licence = strip(meta.LicenseShortName?.value) || "see source";
	let who = strip(meta.Artist?.value);
	const bare = title.replace(/^File:/, "");
	if (/^HUA-/.test(bare) && (!who || /unknown|utrecht archives/i.test(who)))
		who = "Het Utrechts Archief";
	else if (/ - RCE\./.test(bare) && !who)
		who = "Rijksdienst voor het Cultureel Erfgoed";
	if (!who) who = strip(meta.Credit?.value) || "Wikimedia Commons";
	if (who.length > 60) who = `${who.slice(0, 57).trim()}…`;
	return { credit: `${who}, ${licence}`, licence };
}

/** Returns the cached or freshly downloaded photo, or null when unavailable (offline etc). */
export async function ensurePhoto(
	key: string,
	title: string,
): Promise<FetchedPhoto | null> {
	const hash = createHash("sha1").update(title).digest("hex").slice(0, 10);
	const file = `sample-${key}-${hash}.jpg`;
	const dir = photoDir();
	const path = join(dir, file);
	const side = join(dir, `sample-${key}-${hash}.json`);
	if (existsSync(path) && existsSync(side))
		return { file, ...JSON.parse(readFileSync(side, "utf8")) };
	try {
		const q = new URLSearchParams({
			action: "query",
			titles: title,
			prop: "imageinfo",
			iiprop: "url|extmetadata",
			iiurlwidth: "1600",
			format: "json",
		});
		const info = (await (await get(`${API}?${q}`)).json()) as {
			query?: {
				pages?: Record<
					string,
					{
						imageinfo?: {
							thumburl?: string;
							url: string;
							descriptionurl: string;
							extmetadata: Record<string, { value?: string }>;
						}[];
					}
				>;
			};
		};
		const ii = Object.values(info.query?.pages ?? {})[0]?.imageinfo?.[0];
		if (!ii) throw new Error("not found on Commons");
		const { credit, licence } = creditLine(title, ii.extmetadata);
		if (!OK_LICENCE.test(licence))
			throw new Error(`licence "${licence}" doesn't allow reuse`);
		const res = await get(ii.thumburl ?? ii.url);
		if (!res.ok) throw new Error(`download ${res.status}`);
		writeFileSync(path, Buffer.from(await res.arrayBuffer()));
		const meta = { credit, sourceUrl: ii.descriptionurl };
		writeFileSync(side, JSON.stringify(meta));
		return { file, ...meta };
	} catch (err) {
		console.warn(`  photo for ${key} skipped: ${(err as Error).message}`);
		return null;
	}
}
