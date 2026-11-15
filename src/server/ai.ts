/**
 * AI client, OpenAI-compatible endpoints configured by env. Text goes to OPENAI_* with
 * OPENAI_BACKUP_* as fallback; speech-to-text and embeddings go to OPENAI_LISTEN_*.
 *
 * Every caller must cope with `null` — the app keeps working without AI, it just asks the person
 * to do the step by hand.
 */
import type { z } from "zod";

type Provider = { name: string; url: string; key: string; model: string };

function textProviders(): Provider[] {
	const out: Provider[] = [];
	const e = process.env;
	if (e.OPENAI_KEY && e.OPENAI_URL && e.OPENAI_MODEL)
		out.push({
			name: "primary",
			url: e.OPENAI_URL,
			key: e.OPENAI_KEY,
			model: e.OPENAI_MODEL,
		});
	if (e.OPENAI_BACKUP_KEY && e.OPENAI_BACKUP_URL && e.OPENAI_BACKUP_MODEL)
		out.push({
			name: "backup",
			url: e.OPENAI_BACKUP_URL,
			key: e.OPENAI_BACKUP_KEY,
			model: e.OPENAI_BACKUP_MODEL,
		});
	return out;
}

/** The speech/embeddings endpoint, or null when not configured. */
function listenEndpoint(): { url: string; key: string } | null {
	const { OPENAI_LISTEN_KEY: key, OPENAI_LISTEN_URL: url } = process.env;
	return key && url ? { url: url.replace(/\/$/, ""), key } : null;
}

function extractJson(text: string): unknown {
	const cleaned = text
		.replace(/^```(?:json)?\s*/i, "")
		.replace(/```\s*$/, "")
		.trim();
	try {
		return JSON.parse(cleaned);
	} catch {
		const start = cleaned.indexOf("{");
		const end = cleaned.lastIndexOf("}");
		if (start >= 0 && end > start)
			return JSON.parse(cleaned.slice(start, end + 1));
		throw new Error("No JSON object in model output");
	}
}

/**
 * Ask for a JSON object matching `schema`. Tries each provider in turn; returns null if all fail.
 */
export async function chatJson<T>(opts: {
	system: string;
	user: string;
	schema: z.ZodType<T>;
	temperature?: number;
	timeoutMs?: number;
}): Promise<T | null> {
	for (const p of textProviders()) {
		try {
			const res = await fetch(`${p.url.replace(/\/$/, "")}/chat/completions`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${p.key}`,
					"Content-Type": "application/json",
				},
				signal: AbortSignal.timeout(opts.timeoutMs ?? 25_000),
				body: JSON.stringify({
					model: p.model,
					temperature: opts.temperature ?? 0.4,
					max_tokens: 4000,
					response_format: { type: "json_object" },
					messages: [
						{
							role: "system",
							content: `${opts.system}\n\nRespond with a single JSON object only.`,
						},
						{ role: "user", content: opts.user },
					],
				}),
			});
			if (!res.ok)
				throw new Error(
					`${p.name} ${res.status}: ${(await res.text()).slice(0, 200)}`,
				);
			const data = (await res.json()) as {
				choices?: { message?: { content?: string } }[];
			};
			const content = data.choices?.[0]?.message?.content;
			if (!content) throw new Error(`${p.name}: empty content`);
			const parsed = opts.schema.safeParse(extractJson(content));
			if (!parsed.success)
				throw new Error(
					`${p.name}: schema mismatch ${parsed.error.message.slice(0, 200)}`,
				);
			return parsed.data;
		} catch (err) {
			console.warn(`[ai] ${p.name} failed:`, (err as Error).message);
		}
	}
	return null;
}

/** Speech-to-text. Returns null when unavailable. */
export async function transcribe(
	audio: Blob,
	filename: string,
	language?: string,
): Promise<{ text: string; language: string | null } | null> {
	const ep = listenEndpoint();
	const model = process.env.OPENAI_LISTEN_MODEL;
	if (!ep || !model) return null;
	try {
		const form = new FormData();
		form.set("model", model);
		form.set("file", audio, filename);
		if (language) form.set("language", language);
		const res = await fetch(`${ep.url}/audio/transcriptions`, {
			method: "POST",
			headers: { Authorization: `Bearer ${ep.key}` },
			body: form,
			signal: AbortSignal.timeout(120_000),
		});
		if (!res.ok)
			throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
		const data = (await res.json()) as {
			text?: string;
			language?: string | null;
		};
		return { text: (data.text ?? "").trim(), language: data.language ?? null };
	} catch (err) {
		console.warn("[ai] transcribe failed:", (err as Error).message);
		return null;
	}
}

/** Embedding vectors. Returns null when unavailable. */
export async function embed(texts: string[]): Promise<number[][] | null> {
	const ep = listenEndpoint();
	const model = process.env.OPENAI_EMBED_MODEL;
	if (!ep || !model || texts.length === 0) return null;
	try {
		const res = await fetch(`${ep.url}/embeddings`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${ep.key}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ model, input: texts }),
			signal: AbortSignal.timeout(30_000),
		});
		if (!res.ok) throw new Error(`${res.status}`);
		const data = (await res.json()) as { data: { embedding: number[] }[] };
		return data.data.map((d) => d.embedding);
	} catch (err) {
		console.warn("[ai] embed failed:", (err as Error).message);
		return null;
	}
}

export function cosine(a: number[], b: number[]): number {
	let dot = 0;
	let na = 0;
	let nb = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		na += a[i] * a[i];
		nb += b[i] * b[i];
	}
	return na && nb ? dot / Math.sqrt(na * nb) : 0;
}
