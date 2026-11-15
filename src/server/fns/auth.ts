import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { currentUser, endSession, startSession } from "../auth";
import { db } from "../db";
import { codeMatches, hashCode, newCode, sendCodeEmail } from "../email";
import { googleConfigured } from "../google";
import { loginCodes, users } from "../schema";

export const getMe = createServerFn({ method: "GET" }).handler(async () =>
	currentUser(),
);

export const authOptions = createServerFn({ method: "GET" }).handler(
	async () => ({ google: googleConfigured() }),
);

const email = z
	.string()
	.trim()
	.toLowerCase()
	.email("That email doesn't look right.");

const RESEND_WAIT_MS = 30_000;
const CODE_LIFE_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;

export const requestCode = createServerFn({ method: "POST" })
	.validator(z.object({ email }))
	.handler(async ({ data }) => {
		const d = db();
		const prev = d
			.select()
			.from(loginCodes)
			.where(eq(loginCodes.email, data.email))
			.get();
		const wait = prev
			? prev.createdAt.getTime() + RESEND_WAIT_MS - Date.now()
			: 0;
		if (prev && wait > 0)
			throw new Error(
				`Please wait ${Math.ceil(wait / 1000)} seconds before asking for another code.`,
			);
		const code = newCode();
		const row = {
			email: data.email,
			codeHash: hashCode(data.email, code),
			expiresAt: new Date(Date.now() + CODE_LIFE_MS),
			attempts: 0,
			createdAt: new Date(),
		};
		d.insert(loginCodes)
			.values(row)
			.onConflictDoUpdate({ target: loginCodes.email, set: row })
			.run();
		await sendCodeEmail(data.email, code);
		return { ok: true as const, resendIn: RESEND_WAIT_MS / 1000 };
	});

function displayName(addr: string) {
	const base =
		addr
			.split("@")[0]
			.replace(/[._-]+/g, " ")
			.trim() || "Friend";
	return base.charAt(0).toUpperCase() + base.slice(1);
}

export const verifyCode = createServerFn({ method: "POST" })
	.validator(
		z.object({
			email,
			code: z
				.string()
				.trim()
				.regex(/^\d{6}$/, "Enter the 6-digit code."),
			name: z.string().trim().max(60).optional(),
		}),
	)
	.handler(async ({ data }) => {
		const d = db();
		const row = d
			.select()
			.from(loginCodes)
			.where(eq(loginCodes.email, data.email))
			.get();
		const expired = "That code has expired. Ask for a new one.";
		if (!row || row.expiresAt.getTime() < Date.now()) throw new Error(expired);
		if (row.attempts >= MAX_ATTEMPTS) {
			d.delete(loginCodes).where(eq(loginCodes.email, data.email)).run();
			throw new Error("Too many wrong tries. Ask for a new code.");
		}
		if (!codeMatches(data.email, data.code, row.codeHash)) {
			d.update(loginCodes)
				.set({ attempts: row.attempts + 1 })
				.where(eq(loginCodes.email, data.email))
				.run();
			throw new Error("That code isn't right. Check it and try again.");
		}
		d.delete(loginCodes).where(eq(loginCodes.email, data.email)).run();

		let user = d.select().from(users).where(eq(users.email, data.email)).get();
		let isNew = false;
		if (!user) {
			isNew = true;
			const id = nanoid();
			d.insert(users)
				.values({
					id,
					name: data.name || displayName(data.email),
					email: data.email,
				})
				.run();
			user = d.select().from(users).where(eq(users.id, id)).get();
		}
		if (!user) throw new Error("Something went wrong. Please try again.");
		startSession(user.id);
		return { id: user.id, name: user.name, email: user.email, isNew };
	});

export const signInDemo = createServerFn({ method: "POST" }).handler(
	async () => {
		const u = db().select().from(users).where(eq(users.id, "demo-daan")).get();
		if (!u) throw new Error("The demo account isn't set up yet.");
		startSession(u.id);
		return { id: u.id, name: u.name, email: u.email };
	},
);

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
	endSession();
	return { ok: true };
});
