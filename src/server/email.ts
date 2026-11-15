import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

const SECRET =
	process.env.SESSION_SECRET ||
	process.env.AUTH_SECRET ||
	process.env.GOOGLE_CLIENT_SECRET ||
	process.env.RESEND_API_KEY ||
	"hereabouts-dev-secret";

export function newCode(): string {
	return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashCode(email: string, code: string): string {
	return createHmac("sha256", SECRET).update(`${email}:${code}`).digest("hex");
}

export function codeMatches(email: string, code: string, stored: string) {
	const a = Buffer.from(hashCode(email, code), "hex");
	const b = Buffer.from(stored, "hex");
	return a.length === b.length && timingSafeEqual(a, b);
}

/** Addresses whose codes are always logged (test inboxes), plus everything when no mail key / AUTH_LOG_CODES=1. */
export function shouldLogCode(email: string) {
	return (
		!process.env.RESEND_API_KEY ||
		process.env.AUTH_LOG_CODES === "1" ||
		email.endsWith("@resend.dev") ||
		email.endsWith("@hereabouts.demo")
	);
}

function html(code: string) {
	const spaced = code.split("").join("&nbsp;");
	return `<!doctype html><html><body style="margin:0;background:#f4f2ee;font-family:Inter,Helvetica,Arial,sans-serif;color:#17171a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="440" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:16px;border:1px solid #e4e1da">
<tr><td style="padding:28px 32px 0;font-size:15px;font-weight:600;letter-spacing:-0.01em">Hereabouts</td></tr>
<tr><td style="padding:20px 32px 0;font-size:15px;line-height:1.5;color:#55555c">Your sign-in code is below. It works for 10 minutes.</td></tr>
<tr><td style="padding:18px 32px"><div style="background:#17171a;color:#f2c14e;border-radius:12px;padding:20px;text-align:center;font-size:36px;font-weight:600;letter-spacing:6px;font-family:ui-monospace,Menlo,monospace">${spaced}</div></td></tr>
<tr><td style="padding:0 32px 28px;font-size:13px;line-height:1.5;color:#8a8a92">Didn't ask for this? You can ignore this email.</td></tr>
</table></td></tr></table></body></html>`;
}

export async function sendCodeEmail(to: string, code: string) {
	if (shouldLogCode(to)) console.log(`[auth] sign-in code for ${to}: ${code}`);
	const key = process.env.RESEND_API_KEY;
	if (!key) return;
	const res = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${key}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from: process.env.EMAIL_FROM || "Hereabouts <onboarding@resend.dev>",
			to: [to],
			subject: `Your Hereabouts code: ${code}`,
			html: html(code),
			text: `Your Hereabouts code: ${code}\n\nIt works for 10 minutes. Didn't ask for this? Ignore this email.`,
		}),
	});
	if (!res.ok) {
		console.error("[auth] Resend error", res.status, await res.text());
		throw new Error(
			"We couldn't send the email. Please try again in a moment.",
		);
	}
}
