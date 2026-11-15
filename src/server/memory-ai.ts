/**
 * The three small jobs AI does in Hereabouts. Each has a plain fallback so the
 * flow never blocks on a model.
 */
import { z } from "zod";
import { chatJson } from "./ai";

const FALLBACK_QUESTIONS = [
	"Where did you live when you were small? What could you see from the window?",
	"Which shop or café did you go to most? Who worked there?",
	"What did this street sound like on a Saturday morning?",
	"Where did you go to school, and how did you get there?",
	"Where did you meet your closest friend?",
	"Was there a place you weren't allowed to go? Did you go anyway?",
	"What has changed most about this neighbourhood since then?",
	"Where did you go to dance, or to see a film?",
];

const LANG_HINTS: Record<string, string[]> = {
	English: [
		"the",
		"and",
		"there",
		"that",
		"my",
		"with",
		"when",
		"what",
		"we",
		"used",
		"would",
		"remember",
	],
	Dutch: [
		"het",
		"een",
		"en",
		"mijn",
		"daar",
		"dat",
		"ik",
		"niet",
		"toen",
		"wat",
		"ook",
		"heel",
		"nog",
	],
	German: [
		"und",
		"ich",
		"nicht",
		"das",
		"ein",
		"wir",
		"mein",
		"dann",
		"auch",
		"noch",
	],
	French: [
		"le",
		"les",
		"et",
		"je",
		"pas",
		"une",
		"nous",
		"mon",
		"dans",
		"aussi",
	],
};

/**
 * Which language the speaker mostly uses, from function words — so Dutch street names in an
 * English story don't flip the questions into Dutch. Null when the text is too short to tell.
 */
export function guessLanguage(text: string): string | null {
	const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];
	if (words.length < 12) return null;
	let best: [string, number] = ["", 0];
	for (const [lang, hints] of Object.entries(LANG_HINTS)) {
		const set = new Set(hints);
		const n = words.filter((w) => set.has(w)).length;
		if (n > best[1]) best = [lang, n];
	}
	return best[1] >= 3 ? best[0] : null;
}

const LANG_NAMES: Record<string, string> = {
	en: "English",
	nl: "Dutch",
	de: "German",
	fr: "French",
};

export async function suggestQuestions(input: {
	storytellerName: string;
	relation?: string | null;
	bornYear?: number | null;
	transcriptSoFar?: string;
	placeHint?: string;
	asked?: string[];
	language?: string | null;
}): Promise<{ questions: string[]; source: "ai" | "fallback" }> {
	const out = await chatJson({
		system:
			"You help a young person interview an older relative about places they remember. Suggest short, warm, open follow-up questions (max 18 words each) that invite a concrete memory about a specific place: a street, shop, school, house, park. Build on what was just said. Never ask about health, money or trauma. Use plain words an 85-year-old would like. Write the questions in the language given as write_questions_in.",
		user: JSON.stringify({
			storyteller: input.storytellerName,
			relation: input.relation ?? undefined,
			born: input.bornYear ?? undefined,
			place: input.placeHint ?? undefined,
			already_asked: input.asked?.slice(-6),
			write_questions_in:
				guessLanguage(input.transcriptSoFar ?? "") ??
				(input.language
					? (LANG_NAMES[input.language.slice(0, 2)] ?? input.language)
					: "English"),
			transcript_so_far:
				(input.transcriptSoFar ?? "").slice(-2500) ||
				"(nothing yet — this is the first question)",
			want: '{"questions": [3 strings]}',
		}),
		schema: z.object({ questions: z.array(z.string().min(5)).min(1).max(5) }),
		temperature: 0.7,
		timeoutMs: 15_000,
	});
	if (out) return { questions: out.questions.slice(0, 3), source: "ai" };
	const asked = new Set(input.asked ?? []);
	const pool = FALLBACK_QUESTIONS.filter((q) => !asked.has(q));
	return { questions: pool.slice(0, 3), source: "fallback" };
}

export const shapedStorySchema = z.object({
	title: z.string().min(2).max(90),
	summary: z.string().max(240),
	/** the story in the speaker's own words, lightly cleaned; paragraphs separated by \n\n */
	body: z.string().min(1),
	places: z
		.array(z.object({ name: z.string(), search: z.string() }))
		.max(4)
		.default([]),
	year: z.number().int().min(1880).max(2100).nullable().default(null),
	decade: z.number().int().min(1880).max(2100).nullable().default(null),
	tags: z.array(z.string()).max(6).default([]),
});
export type ShapedStory = z.infer<typeof shapedStorySchema>;

function firstSentence(text: string, max = 160) {
	const s = text.split(/(?<=[.!?])\s/)[0] ?? text;
	return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function guessYear(text: string): number | null {
	const m = text.match(/\b(18[89]\d|19\d\d|20[0-2]\d)\b/);
	if (m) return Number(m[1]);
	const d = text.match(/\b(?:the\s+)?(?:19)?([2-9]0)'?s\b/i);
	if (d) return 1900 + Number(d[1]);
	return null;
}

/**
 * Turn a rambling transcript into a readable story. The rule is: keep the speaker's
 * words and voice — remove only filler, false starts and the interviewer's questions.
 */
export async function shapeStory(input: {
	transcript: string;
	storytellerName: string;
	bornYear?: number | null;
	placeHint?: string;
}): Promise<{ story: ShapedStory; source: "ai" | "fallback" }> {
	const out = await chatJson({
		system: [
			"You edit oral-history recordings into short readable stories for a neighbourhood memory map.",
			"Rules:",
			"- Keep the speaker's own words, first person, and their way of speaking. Do NOT embellish, invent details, or add facts that were not said.",
			"- Remove only filler (uh, um), false starts, repetitions and the interviewer's questions.",
			"- Split into short paragraphs separated by a blank line.",
			"- title: 2-7 words, concrete, about the place (e.g. 'Saturday bread at Van Dijk's').",
			"- summary: one sentence in third person naming the speaker.",
			"- places: places mentioned that could be found on a map; `search` is a geocoder query such as 'Voorstraat, Utrecht'. Include the town if it was said.",
			"- year: a specific year if one was said or is clearly implied, else null. decade: first year of the decade (e.g. 1970) if it can be inferred (also from the speaker's birth year and age mentioned), else null.",
			"- tags: up to 4 lowercase single words (e.g. bakery, school, flood, dancing).",
			"- Write in the language the speaker mostly uses (place names in another language do not count).",
			"",
			'Return exactly: {"title": string, "summary": string, "body": string, "places": [{"name": string, "search": string}], "year": number|null, "decade": number|null, "tags": string[]}',
		].join("\n"),
		user: JSON.stringify({
			speaker: input.storytellerName,
			speaker_born: input.bornYear ?? undefined,
			place_hint: input.placeHint ?? undefined,
			language: guessLanguage(input.transcript) ?? undefined,
			transcript: input.transcript.slice(0, 12_000),
		}),
		schema: shapedStorySchema,
		temperature: 0.2,
		timeoutMs: 30_000,
	});
	if (out) {
		const decade =
			out.decade ?? (out.year ? Math.floor(out.year / 10) * 10 : null);
		return { story: { ...out, decade }, source: "ai" };
	}
	// drop a leading interviewer question ("Where did you go to school?") before titling
	const text = input.transcript.trim().replace(/^[^.!?]{0,120}\?\s+/, "");
	const year = guessYear(text);
	return {
		source: "fallback",
		story: {
			title: firstSentence(text, 48).replace(/[.!?…]+$/, "") || "A memory",
			summary: `${input.storytellerName} remembers: ${firstSentence(text, 140)}`,
			body: text,
			places: input.placeHint
				? [{ name: input.placeHint, search: input.placeHint }]
				: [],
			year,
			decade: year ? Math.floor(year / 10) * 10 : null,
			tags: [],
		},
	};
}
