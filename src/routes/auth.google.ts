import { randomBytes } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { safeRedirect } from "#/components/home/auth";
import { authUrl, googleConfigured } from "#/server/google";

/** GET /auth/google?redirect=/path: starts the Google sign-in. */
export const Route = createFileRoute("/auth/google")({
	server: {
		handlers: {
			GET: ({ request }) => {
				if (!googleConfigured())
					return new Response(null, {
						status: 302,
						headers: { Location: "/signin?error=google" },
					});
				const url = new URL(request.url);
				const state = randomBytes(16).toString("base64url");
				const back = safeRedirect(url.searchParams.get("redirect")) ?? "/map";
				const payload = encodeURIComponent(JSON.stringify({ state, back }));
				const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
				return new Response(null, {
					status: 302,
					headers: {
						Location: authUrl(state),
						"Set-Cookie": `hb_oauth=${payload}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600${secure}`,
					},
				});
			},
		},
	},
});
