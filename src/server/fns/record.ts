import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "../auth";
import { db } from "../db";
import { reverseGeocode, searchPlaces } from "../geo";
import { shapeStory, suggestQuestions } from "../memory-ai";
import { storytellers } from "../schema";

function kmBetween(
	a: { lat: number; lng: number },
	b: { lat: number; lng: number },
) {
	const dLat = (b.lat - a.lat) * 111;
	const dLng = (b.lng - a.lng) * 111 * Math.cos((a.lat * Math.PI) / 180);
	return Math.hypot(dLat, dLng);
}

function ownTeller(userId: string, id: string) {
	const t = db()
		.select()
		.from(storytellers)
		.where(and(eq(storytellers.id, id), eq(storytellers.ownerId, userId)))
		.get();
	if (!t) throw new Error("Storyteller not found.");
	return t;
}

/** Interview helper: three next questions, building on what was just said. */
export const nextQuestions = createServerFn({ method: "POST" })
	.validator(
		z.object({
			storytellerId: z.string(),
			transcriptSoFar: z.string().max(20_000).default(""),
			asked: z.array(z.string()).max(30).default([]),
			placeHint: z.string().max(200).optional(),
			language: z.string().max(10).nullish(),
		}),
	)
	.handler(async ({ data }) => {
		const user = requireUser();
		const t = ownTeller(user.id, data.storytellerId);
		return suggestQuestions({
			language: data.language,
			storytellerName: t.name,
			relation: t.relation,
			bornYear: t.bornYear,
			transcriptSoFar: data.transcriptSoFar,
			asked: data.asked,
			placeHint: data.placeHint,
		});
	});

/** Transcript → title, readable story, place + decade suggestions. Person confirms everything. */
export const shapeTranscript = createServerFn({ method: "POST" })
	.validator(
		z.object({
			storytellerId: z.string(),
			transcript: z.string().min(1).max(40_000),
			placeHint: z.string().max(200).optional(),
		}),
	)
	.handler(async ({ data }) => {
		const user = requireUser();
		const t = ownTeller(user.id, data.storytellerId);
		const shaped = await shapeStory({
			transcript: data.transcript,
			storytellerName: t.name,
			bornYear: t.bornYear,
			placeHint: data.placeHint,
		});
		// Resolve mentioned places to coordinates so the map can jump there. The first hit anchors
		// the town; later hits must lie near it (drops "Nieuwe Gracht, Haarlem" for a Utrecht story).
		const placeSuggestions: {
			label: string;
			lat: number;
			lng: number;
			mentioned: string;
		}[] = [];
		let anchor: { lat: number; lng: number } | undefined;
		let town: string | undefined;
		for (const p of shaped.story.places.slice(0, 3)) {
			// once we know the town, keep later lookups in it ("Wilhelmina Park" → "Wilhelmina Park, Utrecht")
			const query =
				town && !p.search.includes(",") ? `${p.search}, ${town}` : p.search;
			const hits = await searchPlaces(query, anchor);
			for (const h of hits.slice(0, 3)) {
				if (anchor && kmBetween(anchor, h) > 12) continue;
				town ??= h.label.split(",").at(-1)?.trim();
				anchor ??= h;
				if (placeSuggestions.some((s) => s.label === h.label)) continue;
				placeSuggestions.push({ ...h, mentioned: p.name });
				break;
			}
		}
		return { ...shaped, placeSuggestions };
	});

export const findPlaces = createServerFn({ method: "GET" })
	.validator(
		z.object({
			q: z.string().max(200),
			near: z.object({ lat: z.number(), lng: z.number() }).optional(),
		}),
	)
	.handler(async ({ data }) => searchPlaces(data.q, data.near));

export const placeName = createServerFn({ method: "GET" })
	.validator(z.object({ lat: z.number(), lng: z.number() }))
	.handler(async ({ data }) => ({
		label: await reverseGeocode(data.lat, data.lng),
	}));
