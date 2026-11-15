import { randomBytes } from "node:crypto";
import {
	deleteCookie,
	getCookie,
	setCookie,
} from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { sessions, type User, users } from "./schema";

const COOKIE = "hb_session";
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

/** Creates a session row and returns a ready-to-send Set-Cookie header value (for plain Response handlers). */
export function sessionCookieHeader(userId: string) {
	const id = randomBytes(24).toString("base64url");
	const expiresAt = new Date(Date.now() + THIRTY_DAYS);
	db().insert(sessions).values({ id, userId, expiresAt }).run();
	const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
	return `${COOKIE}=${id}; HttpOnly; SameSite=Lax; Path=/; Expires=${expiresAt.toUTCString()}${secure}`;
}

export function startSession(userId: string) {
	const id = randomBytes(24).toString("base64url");
	const expiresAt = new Date(Date.now() + THIRTY_DAYS);
	db().insert(sessions).values({ id, userId, expiresAt }).run();
	setCookie(COOKIE, id, {
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
		expires: expiresAt,
	});
}

export function endSession() {
	const id = getCookie(COOKIE);
	if (id) db().delete(sessions).where(eq(sessions.id, id)).run();
	deleteCookie(COOKIE, { path: "/" });
}

export type PublicUser = Pick<User, "id" | "name" | "email">;

/** The signed-in user for the current request, or null. Server-only. */
export function currentUser(): PublicUser | null {
	const id = getCookie(COOKIE);
	if (!id) return null;
	const row = db()
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			expiresAt: sessions.expiresAt,
		})
		.from(sessions)
		.innerJoin(users, eq(users.id, sessions.userId))
		.where(eq(sessions.id, id))
		.get();
	if (!row || row.expiresAt.getTime() < Date.now()) return null;
	return { id: row.id, name: row.name, email: row.email };
}

export class AuthError extends Error {
	constructor(message = "Sign in to continue.") {
		super(message);
		this.name = "AuthError";
	}
}

export function requireUser(): PublicUser {
	const u = currentUser();
	if (!u) throw new AuthError();
	return u;
}
