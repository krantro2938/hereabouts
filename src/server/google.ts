export const googleConfigured = () =>
	Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const appUrl = () =>
	(process.env.APP_URL || "http://localhost:8080").replace(/\/$/, "");

export const redirectUri = () => `${appUrl()}/auth/google/callback`;

export function authUrl(state: string) {
	const p = new URLSearchParams({
		client_id: process.env.GOOGLE_CLIENT_ID ?? "",
		redirect_uri: redirectUri(),
		response_type: "code",
		scope: "openid email profile",
		state,
		prompt: "select_account",
	});
	return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

export type GoogleProfile = {
	sub: string;
	email: string;
	emailVerified: boolean;
	name: string;
	picture?: string;
};

export async function exchangeCode(code: string): Promise<GoogleProfile> {
	const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			code,
			client_id: process.env.GOOGLE_CLIENT_ID ?? "",
			client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
			redirect_uri: redirectUri(),
			grant_type: "authorization_code",
		}),
	});
	if (!tokenRes.ok) throw new Error("Google didn't accept the sign-in.");
	const { access_token } = (await tokenRes.json()) as { access_token: string };
	const infoRes = await fetch(
		"https://openidconnect.googleapis.com/v1/userinfo",
		{ headers: { Authorization: `Bearer ${access_token}` } },
	);
	if (!infoRes.ok) throw new Error("Couldn't read your Google profile.");
	const i = (await infoRes.json()) as {
		sub: string;
		email?: string;
		email_verified?: boolean;
		name?: string;
		picture?: string;
	};
	if (!i.email) throw new Error("Your Google account has no email address.");
	return {
		sub: i.sub,
		email: i.email.toLowerCase(),
		emailVerified: Boolean(i.email_verified),
		name: i.name || i.email.split("@")[0],
		picture: i.picture,
	};
}
