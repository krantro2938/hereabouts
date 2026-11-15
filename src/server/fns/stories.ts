import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, gte, lte, ne, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { canView, myCircleIds, visibleTo } from "../access";
import { cosine, embed } from "../ai";
import { currentUser, requireUser } from "../auth";
import { db } from "../db";
import { reports, stories, storytellers, users } from "../schema";

const pinColumns = {
	id: stories.id,
	title: stories.title,
	summary: stories.summary,
	lat: stories.lat,
	lng: stories.lng,
	placeLabel: stories.placeLabel,
	decade: stories.decade,
	year: stories.year,
	visibility: stories.visibility,
	isSample: stories.isSample,
	durationMs: stories.durationMs,
	photoFile: stories.photoFile,
	hasAudio: sql<boolean>`${stories.audioFile} is not null`.mapWith(Boolean),
	storytellerId: stories.storytellerId,
	storytellerName: storytellers.name,
	createdAt: stories.createdAt,
};
export type StoryPin = {
	id: string;
	title: string;
	summary: string;
	lat: number;
	lng: number;
	placeLabel: string;
	decade: number;
	year: number | null;
	visibility: "private" | "circle" | "public";
	isSample: boolean;
	durationMs: number | null;
	photoFile: string | null;
	hasAudio: boolean;
	storytellerId: string;
	storytellerName: string;
	createdAt: Date;
};

/** Pins for the map. `scope` narrows to the viewer's own or family stories. */
export const listMapStories = createServerFn({ method: "GET" })
	.validator(
		z.object({
			scope: z
				.enum(["everything", "mine", "family", "public"])
				.default("everything"),
			decadeFrom: z.number().int().optional(),
			decadeTo: z.number().int().optional(),
		}),
	)
	.handler(async ({ data }): Promise<StoryPin[]> => {
		const user = currentUser();
		const where = [visibleTo(user)];
		if (data.scope === "mine" && user)
			where.push(eq(stories.authorId, user.id));
		if (data.scope === "family") where.push(eq(stories.visibility, "circle"));
		if (data.scope === "public") where.push(eq(stories.visibility, "public"));
		if (data.decadeFrom) where.push(gte(stories.decade, data.decadeFrom));
		if (data.decadeTo) where.push(lte(stories.decade, data.decadeTo));
		return db()
			.select(pinColumns)
			.from(stories)
			.innerJoin(storytellers, eq(storytellers.id, stories.storytellerId))
			.where(and(...where))
			.orderBy(stories.decade)
			.all() as StoryPin[];
	});

/** How many visible stories per decade — drives the density marks on the dial. */
export const decadeCounts = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = currentUser();
		const rows = db()
			.select({ decade: stories.decade, n: sql<number>`count(*)` })
			.from(stories)
			.where(visibleTo(user))
			.groupBy(stories.decade)
			.all();
		return Object.fromEntries(
			rows.map((r) => [r.decade, Number(r.n)]),
		) as Record<number, number>;
	},
);

const fmtDistance = (d: number) =>
	d < 1000 ? `${Math.round(d / 10) * 10} m` : `${(d / 1000).toFixed(1)} km`;

function distanceM(
	a: { lat: number; lng: number },
	b: { lat: number; lng: number },
) {
	const R = 6371000;
	const dLat = ((b.lat - a.lat) * Math.PI) / 180;
	const dLng = ((b.lng - a.lng) * Math.PI) / 180;
	const s =
		Math.sin(dLat / 2) ** 2 +
		Math.cos((a.lat * Math.PI) / 180) *
			Math.cos((b.lat * Math.PI) / 180) *
			Math.sin(dLng / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(s));
}

export type Connection = StoryPin & { reason: string; distanceM: number };

export const getStory = createServerFn({ method: "GET" })
	.validator(z.object({ id: z.string() }))
	.handler(async ({ data }) => {
		const user = currentUser();
		const s = db().select().from(stories).where(eq(stories.id, data.id)).get();
		if (!s || !canView(user, s)) return null;
		const teller = db()
			.select()
			.from(storytellers)
			.where(eq(storytellers.id, s.storytellerId))
			.get();
		const author = db()
			.select({ name: users.name })
			.from(users)
			.where(eq(users.id, s.authorId))
			.get();

		// Connected memories: other visible stories close by, ranked by meaning + distance + time.
		const candidates = db()
			.select({ ...pinColumns, embedding: stories.embedding })
			.from(stories)
			.innerJoin(storytellers, eq(storytellers.id, stories.storytellerId))
			.where(and(visibleTo(user), ne(stories.id, s.id)))
			.all();
		const connections: Connection[] = candidates
			.map((c) => {
				const d = distanceM(s, c);
				const sim =
					s.embedding && c.embedding ? cosine(s.embedding, c.embedding) : 0;
				const sameTeller = c.storytellerId === s.storytellerId;
				let score = 0;
				if (d < 150) score += 1.2;
				else if (d < 600) score += 0.6;
				else if (d < 2000) score += 0.2;
				// embedding similarities cluster around 0.82 (median for unrelated stories); only the top tail means "related"
				score += Math.max(0, sim - 0.84) * 12;
				if (c.decade === s.decade) score += 0.35;
				if (sameTeller) score += 0.15;
				const reason =
					d < 150
						? sameTeller
							? `${c.storytellerName} also remembers this spot`
							: `${c.storytellerName} remembers this spot too`
						: sim > 0.88
							? d < 2500
								? `A similar memory, ${fmtDistance(d)} away`
								: "A similar memory"
							: c.decade === s.decade
								? `Also the ${c.decade}s, ${fmtDistance(d)} away`
								: `${fmtDistance(d)} from here`;
				const { embedding: _e, ...pin } = c;
				return {
					...(pin as StoryPin),
					reason,
					distanceM: Math.round(d),
					score,
				};
			})
			.filter((c) => c.score >= 0.5)
			.sort((a, b) => b.score - a.score)
			.slice(0, 4)
			.map(({ score: _s, ...c }) => c);

		const { embedding: _e, ...story } = s;
		return {
			story,
			storyteller: teller ?? null,
			authorName: author?.name ?? "Someone",
			canEdit: !!user && user.id === s.authorId,
			connections,
		};
	});

export const listMyStories = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = requireUser();
		return db()
			.select(pinColumns)
			.from(stories)
			.innerJoin(storytellers, eq(storytellers.id, stories.storytellerId))
			.where(eq(stories.authorId, user.id))
			.orderBy(desc(stories.createdAt))
			.all() as StoryPin[];
	},
);

const storyFields = z.object({
	storytellerId: z.string(),
	title: z.string().trim().min(1).max(120),
	summary: z.string().trim().max(300).default(""),
	body: z.string().trim().min(1),
	transcript: z.string().default(""),
	audioFile: z.string().nullable().default(null),
	audioMime: z.string().nullable().default(null),
	photoFile: z
		.string()
		.regex(/^[\w-]+\.(jpg|png|webp)$/)
		.nullable()
		.default(null),
	durationMs: z.number().int().nullable().default(null),
	lat: z.number().min(-90).max(90),
	lng: z.number().min(-180).max(180),
	placeLabel: z.string().trim().min(1).max(200),
	decade: z.number().int().min(1880).max(2100),
	year: z.number().int().min(1880).max(2100).nullable().default(null),
	tags: z.array(z.string()).max(8).default([]),
	visibility: z.enum(["private", "circle", "public"]).default("private"),
	circleId: z.string().nullable().default(null),
});
export type NewStory = z.input<typeof storyFields>;

function assertCircle(
	userId: string,
	visibility: string,
	circleId: string | null,
) {
	if (visibility !== "circle") return null;
	if (!circleId || !myCircleIds(userId).includes(circleId))
		throw new Error(
			"Pick a family circle you belong to, or choose another option.",
		);
	return circleId;
}

export const createStory = createServerFn({ method: "POST" })
	.validator(storyFields)
	.handler(async ({ data }) => {
		const user = requireUser();
		const teller = db()
			.select()
			.from(storytellers)
			.where(eq(storytellers.id, data.storytellerId))
			.get();
		if (!teller || teller.ownerId !== user.id)
			throw new Error("Storyteller not found.");
		const circleId = assertCircle(user.id, data.visibility, data.circleId);
		const id = nanoid(12);
		const vec = await embed([
			`${data.title}\n${data.placeLabel}\n${data.body}`.slice(0, 6000),
		]);
		db()
			.insert(stories)
			.values({
				...data,
				id,
				authorId: user.id,
				circleId,
				decade: Math.floor(data.decade / 10) * 10,
				embedding: vec?.[0] ?? null,
			})
			.run();
		return { id };
	});

export const updateStory = createServerFn({ method: "POST" })
	.validator(storyFields.partial().extend({ id: z.string() }))
	.handler(async ({ data }) => {
		const user = requireUser();
		const s = db().select().from(stories).where(eq(stories.id, data.id)).get();
		if (!s || s.authorId !== user.id)
			throw new Error("Only the person who recorded this story can edit it.");
		const { id, ...patch } = data;
		const visibility = patch.visibility ?? s.visibility;
		const circleId = assertCircle(
			user.id,
			visibility,
			patch.circleId ?? s.circleId,
		);
		const textChanged = patch.body !== undefined || patch.title !== undefined;
		const vec = textChanged
			? await embed([
					`${patch.title ?? s.title}\n${patch.placeLabel ?? s.placeLabel}\n${patch.body ?? s.body}`.slice(
						0,
						6000,
					),
				])
			: null;
		db()
			.update(stories)
			.set({
				...patch,
				circleId,
				...(patch.decade ? { decade: Math.floor(patch.decade / 10) * 10 } : {}),
				...(vec ? { embedding: vec[0] } : {}),
			})
			.where(eq(stories.id, id))
			.run();
		return { id };
	});

export const deleteStory = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.string() }))
	.handler(async ({ data }) => {
		const user = requireUser();
		const s = db().select().from(stories).where(eq(stories.id, data.id)).get();
		if (!s || s.authorId !== user.id)
			throw new Error("Only the person who recorded this story can delete it.");
		db().delete(stories).where(eq(stories.id, data.id)).run();
		return { ok: true };
	});

/** Anyone can report a public story; three reports hide it pending review. */
export const reportStory = createServerFn({ method: "POST" })
	.validator(
		z.object({ id: z.string(), reason: z.string().trim().min(3).max(500) }),
	)
	.handler(async ({ data }) => {
		const user = currentUser();
		const s = db().select().from(stories).where(eq(stories.id, data.id)).get();
		if (!s || !canView(user, s)) throw new Error("Story not found.");
		db()
			.insert(reports)
			.values({
				id: nanoid(),
				storyId: s.id,
				reporterId: user?.id ?? null,
				reason: data.reason,
			})
			.run();
		const n =
			db()
				.select({ n: sql<number>`count(*)` })
				.from(reports)
				.where(eq(reports.storyId, s.id))
				.get()?.n ?? 0;
		if (Number(n) >= 3)
			db()
				.update(stories)
				.set({ hidden: true })
				.where(eq(stories.id, s.id))
				.run();
		return { ok: true };
	});
