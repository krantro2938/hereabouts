import { sql } from "drizzle-orm";
import {
	integer,
	primaryKey,
	real,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

const createdAt = () =>
	integer("created_at", { mode: "timestamp_ms" })
		.notNull()
		.default(sql`(unixepoch() * 1000)`);

export const users = sqliteTable("users", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	/** "" for accounts that sign in with an email code or Google */
	passwordHash: text("password_hash").notNull().default(""),
	googleId: text("google_id"),
	avatarUrl: text("avatar_url"),
	createdAt: createdAt(),
});

/** One-time 6-digit sign-in codes sent by email. Stored hashed; 10-minute life, 5 tries. */
export const loginCodes = sqliteTable("login_codes", {
	email: text("email").primaryKey(),
	codeHash: text("code_hash").notNull(),
	expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
	attempts: integer("attempts").notNull().default(0),
	createdAt: createdAt(),
});

export const sessions = sqliteTable("sessions", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});

/** A family (or any small group) that shares "circle" stories. */
export const circles = sqliteTable("circles", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	inviteCode: text("invite_code").notNull().unique(),
	ownerId: text("owner_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	createdAt: createdAt(),
});

export const circleMembers = sqliteTable(
	"circle_members",
	{
		circleId: text("circle_id")
			.notNull()
			.references(() => circles.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		joinedAt: integer("joined_at", { mode: "timestamp_ms" })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
	},
	(t) => [primaryKey({ columns: [t.circleId, t.userId] })],
);

/** The person whose memories are being recorded — often not a user themselves (e.g. a grandparent). */
export const storytellers = sqliteTable("storytellers", {
	id: text("id").primaryKey(),
	ownerId: text("owner_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	/** how the recorder knows them: "my grandmother", "our neighbour" */
	relation: text("relation"),
	bornYear: integer("born_year"),
	bio: text("bio"),
	createdAt: createdAt(),
});

export type Visibility = "private" | "circle" | "public";

export const stories = sqliteTable("stories", {
	id: text("id").primaryKey(),
	authorId: text("author_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	storytellerId: text("storyteller_id")
		.notNull()
		.references(() => storytellers.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	/** one-sentence teaser shown on pins and lists */
	summary: text("summary").notNull().default(""),
	/** the shaped story, in the storyteller's own words, paragraphs separated by blank lines */
	body: text("body").notNull(),
	/** the raw transcript, kept verbatim */
	transcript: text("transcript").notNull().default(""),
	/** file name inside AUDIO_DIR */
	audioFile: text("audio_file"),
	audioMime: text("audio_mime"),
	durationMs: integer("duration_ms"),
	/** optional photo of the place: file name inside PHOTO_DIR (data/photos) */
	photoFile: text("photo_file"),
	/** attribution line for photos we didn't take, e.g. "Het Utrechts Archief, CC0" */
	photoCredit: text("photo_credit"),
	/** where the photo came from (Wikimedia Commons file page) */
	photoSourceUrl: text("photo_source_url"),
	lat: real("lat").notNull(),
	lng: real("lng").notNull(),
	placeLabel: text("place_label").notNull(),
	/** first year of the decade, e.g. 1970 */
	decade: integer("decade").notNull(),
	year: integer("year"),
	tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
	visibility: text("visibility")
		.$type<Visibility>()
		.notNull()
		.default("private"),
	circleId: text("circle_id").references(() => circles.id, {
		onDelete: "set null",
	}),
	/** embedding vector, JSON array; null when embeddings were unavailable */
	embedding: text("embedding", { mode: "json" }).$type<number[] | null>(),
	/** seeded demo content, labelled as such in the UI */
	isSample: integer("is_sample", { mode: "boolean" }).notNull().default(false),
	hidden: integer("hidden", { mode: "boolean" }).notNull().default(false),
	createdAt: createdAt(),
});

export const reports = sqliteTable("reports", {
	id: text("id").primaryKey(),
	storyId: text("story_id")
		.notNull()
		.references(() => stories.id, { onDelete: "cascade" }),
	reporterId: text("reporter_id").references(() => users.id, {
		onDelete: "set null",
	}),
	reason: text("reason").notNull(),
	createdAt: createdAt(),
});

export type User = typeof users.$inferSelect;
export type Story = typeof stories.$inferSelect;
export type Storyteller = typeof storytellers.$inferSelect;
export type Circle = typeof circles.$inferSelect;
