import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, sql } from "drizzle-orm";
import { customAlphabet, nanoid } from "nanoid";
import { z } from "zod";
import { visibleTo } from "../access";
import { currentUser, requireUser } from "../auth";
import { db } from "../db";
import {
	circleMembers,
	circles,
	stories,
	storytellers,
	users,
} from "../schema";

// ── Storytellers ────────────────────────────────────────────────────────────

export const listMyStorytellers = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = requireUser();
		return db()
			.select({
				id: storytellers.id,
				name: storytellers.name,
				relation: storytellers.relation,
				bornYear: storytellers.bornYear,
				bio: storytellers.bio,
				storyCount:
					sql<number>`(select count(*) from stories s where s.storyteller_id = storytellers.id)`.mapWith(
						Number,
					),
			})
			.from(storytellers)
			.where(eq(storytellers.ownerId, user.id))
			.orderBy(desc(storytellers.createdAt))
			.all();
	},
);

const tellerFields = z.object({
	name: z.string().trim().min(1, "Add their name.").max(80),
	relation: z.string().trim().max(80).nullable().default(null),
	bornYear: z.number().int().min(1900).max(2020).nullable().default(null),
	bio: z.string().trim().max(600).nullable().default(null),
});

export const createStoryteller = createServerFn({ method: "POST" })
	.validator(tellerFields)
	.handler(async ({ data }) => {
		const user = requireUser();
		const id = nanoid(10);
		db()
			.insert(storytellers)
			.values({ ...data, id, ownerId: user.id })
			.run();
		return { id, ...data };
	});

export const updateStoryteller = createServerFn({ method: "POST" })
	.validator(tellerFields.partial().extend({ id: z.string() }))
	.handler(async ({ data }) => {
		const user = requireUser();
		const { id, ...patch } = data;
		db()
			.update(storytellers)
			.set(patch)
			.where(and(eq(storytellers.id, id), eq(storytellers.ownerId, user.id)))
			.run();
		return { id };
	});

/** A storyteller's page: their visible stories, oldest memory first. */
export const getStoryteller = createServerFn({ method: "GET" })
	.validator(z.object({ id: z.string() }))
	.handler(async ({ data }) => {
		const user = currentUser();
		const t = db()
			.select()
			.from(storytellers)
			.where(eq(storytellers.id, data.id))
			.get();
		if (!t) return null;
		const list = db()
			.select({
				id: stories.id,
				title: stories.title,
				summary: stories.summary,
				placeLabel: stories.placeLabel,
				lat: stories.lat,
				lng: stories.lng,
				decade: stories.decade,
				year: stories.year,
				durationMs: stories.durationMs,
				audioFile: stories.audioFile,
				hasAudio: sql<boolean>`${stories.audioFile} is not null`.mapWith(
					Boolean,
				),
				visibility: stories.visibility,
			})
			.from(stories)
			.where(and(eq(stories.storytellerId, t.id), visibleTo(user)))
			.orderBy(stories.decade, stories.year)
			.all();
		const isOwner = !!user && user.id === t.ownerId;
		if (!isOwner && list.length === 0) return null;
		const owner = db()
			.select({ name: users.name })
			.from(users)
			.where(eq(users.id, t.ownerId))
			.get();
		return {
			storyteller: t,
			stories: list,
			isOwner,
			recordedBy: owner?.name ?? "",
		};
	});

// ── Family circles ──────────────────────────────────────────────────────────

const inviteCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

export const listMyCircles = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = currentUser();
		if (!user) return [];
		return db()
			.select({
				id: circles.id,
				name: circles.name,
				inviteCode: circles.inviteCode,
				isOwner: sql<boolean>`${circles.ownerId} = ${user.id}`.mapWith(Boolean),
				memberCount:
					sql<number>`(select count(*) from circle_members m where m.circle_id = ${circles.id})`.mapWith(
						Number,
					),
				storyCount:
					sql<number>`(select count(*) from stories s where s.circle_id = ${circles.id} and s.visibility = 'circle')`.mapWith(
						Number,
					),
			})
			.from(circles)
			.innerJoin(
				circleMembers,
				and(
					eq(circleMembers.circleId, circles.id),
					eq(circleMembers.userId, user.id),
				),
			)
			.all();
	},
);

export const createCircle = createServerFn({ method: "POST" })
	.validator(
		z.object({
			name: z.string().trim().min(1, "Give your circle a name.").max(60),
		}),
	)
	.handler(async ({ data }) => {
		const user = requireUser();
		const id = nanoid(10);
		const code = inviteCode();
		db()
			.insert(circles)
			.values({ id, name: data.name, inviteCode: code, ownerId: user.id })
			.run();
		db().insert(circleMembers).values({ circleId: id, userId: user.id }).run();
		return { id, name: data.name, inviteCode: code };
	});

export const joinCircle = createServerFn({ method: "POST" })
	.validator(z.object({ code: z.string().trim().toUpperCase().min(4) }))
	.handler(async ({ data }) => {
		const user = requireUser();
		const c = db()
			.select()
			.from(circles)
			.where(eq(circles.inviteCode, data.code.replace(/[^A-Z0-9]/g, "")))
			.get();
		if (!c)
			throw new Error(
				"No circle uses that code. Check it with whoever sent it.",
			);
		db()
			.insert(circleMembers)
			.values({ circleId: c.id, userId: user.id })
			.onConflictDoNothing()
			.run();
		return { id: c.id, name: c.name };
	});

export const getCircle = createServerFn({ method: "GET" })
	.validator(z.object({ id: z.string() }))
	.handler(async ({ data }) => {
		const user = requireUser();
		const c = db().select().from(circles).where(eq(circles.id, data.id)).get();
		if (!c) return null;
		const members = db()
			.select({
				id: users.id,
				name: users.name,
				joinedAt: circleMembers.joinedAt,
			})
			.from(circleMembers)
			.innerJoin(users, eq(users.id, circleMembers.userId))
			.where(eq(circleMembers.circleId, c.id))
			.all();
		if (!members.some((m) => m.id === user.id)) return null;
		const list = db()
			.select({
				id: stories.id,
				title: stories.title,
				summary: stories.summary,
				placeLabel: stories.placeLabel,
				decade: stories.decade,
				year: stories.year,
				hasAudio: sql<boolean>`${stories.audioFile} is not null`.mapWith(
					Boolean,
				),
				durationMs: stories.durationMs,
				storytellerId: stories.storytellerId,
				storytellerName: storytellers.name,
			})
			.from(stories)
			.innerJoin(storytellers, eq(storytellers.id, stories.storytellerId))
			.where(and(eq(stories.circleId, c.id), eq(stories.visibility, "circle")))
			.orderBy(desc(stories.createdAt))
			.all();
		return {
			circle: { ...c, isOwner: c.ownerId === user.id },
			members,
			stories: list,
		};
	});

export const leaveCircle = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.string() }))
	.handler(async ({ data }) => {
		const user = requireUser();
		db()
			.delete(circleMembers)
			.where(
				and(
					eq(circleMembers.circleId, data.id),
					eq(circleMembers.userId, user.id),
				),
			)
			.run();
		return { ok: true };
	});
