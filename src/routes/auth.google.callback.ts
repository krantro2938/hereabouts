import { createFileRoute } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { safeRedirect } from "#/components/home/auth";
import { sessionCookieHeader } from "#/server/auth";
import { db } from "#/server/db";
import { exchangeCode } from "#/server/google";
import { users } from "#/server/schema";

const fail = (msg: string) =>
	new Response(null, {
		status: 302,
		headers: {
			Location: `/signin?error=google&message=${encodeURIComponent(msg)}`,
			"Set-Cookie": "hb_oauth=; Path=/; Max-Age=0",
		},
	});

/** GET /auth/google/callback: finishes the Google sign-in. */
export const Route = createFileRoute("/auth/google/callback")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				if (url.searchParams.get("error"))
					return fail("Google sign-in was cancelled.");
				let saved: { state?: string; back?: string } = {};
				try {
					saved = JSON.parse(
						decodeURIComponent(getCookie("hb_oauth") ?? "") || "{}",
					);
				} catch {}
				const code = url.searchParams.get("code");
				if (
					!code ||
					!saved.state ||
					saved.state !== url.searchParams.get("state")
				)
					return fail("That sign-in link expired. Please try again.");
				try {
					const g = await exchangeCode(code);
					const d = db();
					let user = d
						.select()
						.from(users)
						.where(eq(users.googleId, g.sub))
						.get();
					if (!user && g.emailVerified) {
						user = d.select().from(users).where(eq(users.email, g.email)).get();
						if (user)
							d.update(users)
								.set({
									googleId: g.sub,
									avatarUrl: user.avatarUrl ?? g.picture ?? null,
								})
								.where(eq(users.id, user.id))
								.run();
					}
					if (!user) {
						if (!g.emailVerified)
							return fail("Your Google email isn't verified.");
						const id = nanoid();
						d.insert(users)
							.values({
								id,
								name: g.name,
								email: g.email,
								googleId: g.sub,
								avatarUrl: g.picture ?? null,
							})
							.run();
						user = d.select().from(users).where(eq(users.id, id)).get();
					}
					if (!user) return fail("We couldn't finish signing you in.");
					const headers = new Headers();
					headers.set("Location", safeRedirect(saved.back) ?? "/map");
					headers.append("Set-Cookie", sessionCookieHeader(user.id));
					headers.append("Set-Cookie", "hb_oauth=; Path=/; Max-Age=0");
					return new Response(null, {
						status: 302,
						headers,
					});
				} catch (e) {
					console.error("[auth] google", e);
					return fail("We couldn't finish signing you in with Google.");
				}
			},
		},
	},
});
