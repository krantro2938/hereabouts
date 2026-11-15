/**
 * Seed the demo: two accounts, a family circle, five sample storytellers and their memories
 * in Utrecht, read aloud by synthetic voices when OPENAI_LISTEN_* and OPENAI_VOICE_MODEL are set.
 *
 *   pnpm seed            # (re)create sample data; reuses cached audio
 *   pnpm seed --no-audio # skip voice generation
 *   pnpm seed --no-photos # skip fetching place photos from Wikimedia Commons
 *
 * Demo account: daan@hereabouts.demo (the "Try the demo account" button signs in as Daan)
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { eq, inArray } from "drizzle-orm";
import { embed } from "../src/server/ai";
import { audioDir } from "../src/server/audio";
import { db } from "../src/server/db";
import {
	circleMembers,
	circles,
	stories,
	storytellers,
	users,
} from "../src/server/schema";
import { ensurePhoto } from "./fetch-photos";
import { STORIES, TELLERS, toTranscript } from "./seed-data";

const withAudio = !process.argv.includes("--no-audio");
const withPhotos = !process.argv.includes("--no-photos");

const ACCOUNTS = {
	daan: {
		id: "demo-daan",
		name: "Daan van Dam",
		email: "daan@hereabouts.demo",
	},
	sanne: {
		id: "demo-sanne",
		name: "Sanne van Dam",
		email: "sanne@hereabouts.demo",
	},
	project: {
		id: "demo-project",
		name: "Utrecht Memory Walk (samples)",
		email: "samples@hereabouts.demo",
	},
} as const;

async function tts(text: string, voice: string): Promise<Buffer | null> {
	const {
		OPENAI_LISTEN_KEY: key,
		OPENAI_LISTEN_URL: url,
		OPENAI_VOICE_MODEL: model,
	} = process.env;
	if (!key || !url || !model) return null;
	const res = await fetch(`${url.replace(/\/$/, "")}/audio/speech`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${key}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model,
			input: text,
			voice,
			response_format: "mp3",
		}),
		signal: AbortSignal.timeout(120_000),
	});
	if (!res.ok) {
		console.warn(
			`  tts failed (${res.status}): ${(await res.text()).slice(0, 160)}`,
		);
		return null;
	}
	const data = (await res.json()) as { audio_data?: string };
	return data.audio_data ? Buffer.from(data.audio_data, "base64") : null;
}

function durationMs(path: string, words: number): number {
	try {
		const out = execFileSync(
			"ffprobe",
			[
				"-v",
				"error",
				"-show_entries",
				"format=duration",
				"-of",
				"csv=p=0",
				path,
			],
			{
				encoding: "utf8",
			},
		);
		const s = Number.parseFloat(out.trim());
		if (Number.isFinite(s)) return Math.round(s * 1000);
	} catch {}
	return Math.round((words / 2.4) * 1000);
}

async function main() {
	const d = db();
	console.log("Resetting sample data…");
	const ids = Object.values(ACCOUNTS).map((a) => a.id);
	d.delete(users).where(inArray(users.id, ids)).run(); // cascades to sessions, stories, storytellers, circles
	d.delete(stories).where(eq(stories.isSample, true)).run();

	for (const a of Object.values(ACCOUNTS)) d.insert(users).values(a).run();

	d.insert(circles)
		.values({
			id: "demo-circle",
			name: "Van Dam family",
			inviteCode: "VANDAM",
			ownerId: ACCOUNTS.daan.id,
		})
		.run();
	d.insert(circleMembers)
		.values([
			{ circleId: "demo-circle", userId: ACCOUNTS.daan.id },
			{ circleId: "demo-circle", userId: ACCOUNTS.sanne.id },
		])
		.run();

	const tellerIds = new Map<
		string,
		{ id: string; owner: string; voice: string; name: string }
	>();
	for (const t of TELLERS) {
		const id = `sample-${t.key}`;
		const owner = ACCOUNTS[t.owner].id;
		d.insert(storytellers)
			.values({
				id,
				ownerId: owner,
				name: t.name,
				relation: t.relation,
				bornYear: t.bornYear,
				bio: t.bio,
			})
			.run();
		tellerIds.set(t.key, { id, owner, voice: t.voice, name: t.name });
	}

	console.log("Embedding stories…");
	const vectors = await embed(
		STORIES.map((s) => `${s.title}\n${s.place}\n${s.body}`),
	);

	const dir = audioDir();
	for (const [i, s] of STORIES.entries()) {
		const teller = tellerIds.get(s.teller);
		if (!teller) throw new Error(`unknown teller ${s.teller}`);
		let audioFile: string | null = null;
		let ms: number | null = null;
		if (withAudio) {
			const hash = createHash("sha1")
				.update(`${teller.voice}|${s.body}`)
				.digest("hex")
				.slice(0, 10);
			audioFile = `sample-${s.key}-${hash}.mp3`;
			const path = join(dir, audioFile);
			if (!existsSync(path)) {
				process.stdout.write(`  voicing “${s.title}”… `);
				const mp3 = await tts(s.body.replace(/\n\n/g, "\n"), teller.voice);
				if (mp3) {
					writeFileSync(path, mp3);
					console.log("ok");
				} else {
					audioFile = null;
					console.log("skipped");
				}
			}
			if (audioFile) ms = durationMs(path, s.body.split(/\s+/).length);
		}
		const photo =
			withPhotos && s.photo ? await ensurePhoto(s.key, s.photo.title) : null;
		d.insert(stories)
			.values({
				id: `sample-${s.key}`,
				authorId: teller.owner,
				storytellerId: teller.id,
				title: s.title,
				summary: s.summary,
				body: s.body,
				transcript: toTranscript(s.body),
				audioFile,
				audioMime: audioFile ? "audio/mpeg" : null,
				durationMs: ms,
				photoFile: photo?.file ?? null,
				photoCredit: photo?.credit ?? null,
				photoSourceUrl: photo?.sourceUrl ?? null,
				lat: s.lat,
				lng: s.lng,
				placeLabel: s.place,
				decade: s.decade,
				year: s.year,
				tags: s.tags,
				visibility: s.visibility ?? "public",
				circleId: s.visibility === "circle" ? "demo-circle" : null,
				embedding: vectors?.[i] ?? null,
				isSample: true,
				createdAt: new Date(Date.now() - (STORIES.length - i) * 86_400_000),
			})
			.run();
	}
	console.log(
		`Seeded ${TELLERS.length} storytellers and ${STORIES.length} memories.`,
	);
	console.log("Demo account: daan@hereabouts.demo");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
