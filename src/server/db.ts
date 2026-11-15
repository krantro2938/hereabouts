import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const DDL = `
CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL DEFAULT '', google_id TEXT, avatar_url TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000));
CREATE TABLE IF NOT EXISTS login_codes (
	email TEXT PRIMARY KEY, code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL,
	attempts INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000));
CREATE TABLE IF NOT EXISTS sessions (
	id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS circles (
	id TEXT PRIMARY KEY, name TEXT NOT NULL, invite_code TEXT NOT NULL UNIQUE,
	owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000));
CREATE TABLE IF NOT EXISTS circle_members (
	circle_id TEXT NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	joined_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
	PRIMARY KEY (circle_id, user_id));
CREATE TABLE IF NOT EXISTS storytellers (
	id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	name TEXT NOT NULL, relation TEXT, born_year INTEGER, bio TEXT,
	created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000));
CREATE TABLE IF NOT EXISTS stories (
	id TEXT PRIMARY KEY,
	author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	storyteller_id TEXT NOT NULL REFERENCES storytellers(id) ON DELETE CASCADE,
	title TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '', body TEXT NOT NULL,
	transcript TEXT NOT NULL DEFAULT '', audio_file TEXT, audio_mime TEXT, duration_ms INTEGER,
	photo_file TEXT, photo_credit TEXT, photo_source_url TEXT,
	lat REAL NOT NULL, lng REAL NOT NULL, place_label TEXT NOT NULL,
	decade INTEGER NOT NULL, year INTEGER, tags TEXT NOT NULL DEFAULT '[]',
	visibility TEXT NOT NULL DEFAULT 'private', circle_id TEXT REFERENCES circles(id) ON DELETE SET NULL,
	embedding TEXT, is_sample INTEGER NOT NULL DEFAULT 0, hidden INTEGER NOT NULL DEFAULT 0,
	created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000));
CREATE INDEX IF NOT EXISTS stories_visibility ON stories(visibility, decade);
CREATE INDEX IF NOT EXISTS stories_storyteller ON stories(storyteller_id);
CREATE TABLE IF NOT EXISTS reports (
	id TEXT PRIMARY KEY, story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
	reporter_id TEXT REFERENCES users(id) ON DELETE SET NULL, reason TEXT NOT NULL,
	created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000));
`;

/** Columns added after the first release; ALTER them into older databases. */
const ADDED_COLUMNS: [table: string, column: string, ddl: string][] = [
	["users", "google_id", "TEXT"],
	["users", "avatar_url", "TEXT"],
	["stories", "photo_file", "TEXT"],
	["stories", "photo_credit", "TEXT"],
	["stories", "photo_source_url", "TEXT"],
];

function migrate(raw: Database.Database) {
	for (const [table, column, ddl] of ADDED_COLUMNS) {
		const cols = raw.pragma(`table_info(${table})`) as { name: string }[];
		if (!cols.some((c) => c.name === column))
			raw.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
	}
	raw.exec(
		"CREATE UNIQUE INDEX IF NOT EXISTS users_google_id ON users(google_id) WHERE google_id IS NOT NULL",
	);
}

type DB = ReturnType<typeof drizzle<typeof schema>>;
const g = globalThis as unknown as {
	__hereaboutsDb?: { db: DB; raw: Database.Database };
};

function open() {
	const path = process.env.DATABASE_PATH ?? "./data/hereabouts.db";
	mkdirSync(dirname(path), { recursive: true });
	const raw = new Database(path);
	raw.pragma("journal_mode = WAL");
	raw.pragma("foreign_keys = ON");
	raw.exec(DDL);
	migrate(raw);
	return { raw, db: drizzle(raw, { schema }) };
}

/** Lazily-opened singleton (survives Vite HMR). Tables are created on first open. */
export function db(): DB {
	g.__hereaboutsDb ??= open();
	return g.__hereaboutsDb.db;
}

export function rawDb(): Database.Database {
	g.__hereaboutsDb ??= open();
	return g.__hereaboutsDb.raw;
}

export { schema };
