export type Visibility = "private" | "circle" | "public";

export type PlaceSuggestion = {
	label: string;
	lat: number;
	lng: number;
	mentioned: string;
};

export type Draft = {
	step: 1 | 2 | 3 | 4 | 5;
	storytellerId: string | null;
	/** the memory was typed rather than recorded */
	typed: boolean;
	transcript: string;
	audioFile: string | null;
	audioMime: string | null;
	photoFile: string | null;
	durationMs: number | null;
	/** shapeTranscript has run for the current transcript */
	shaped: boolean;
	source: "ai" | "fallback" | "manual";
	title: string;
	summary: string;
	body: string;
	tags: string[];
	placeSuggestions: PlaceSuggestion[];
	lat: number | null;
	lng: number | null;
	placeLabel: string;
	decade: number | null;
	year: number | null;
	visibility: Visibility;
	circleId: string | null;
};

export const initialDraft: Draft = {
	step: 1,
	storytellerId: null,
	typed: false,
	transcript: "",
	audioFile: null,
	audioMime: null,
	photoFile: null,
	durationMs: null,
	shaped: false,
	source: "manual",
	title: "",
	summary: "",
	body: "",
	tags: [],
	placeSuggestions: [],
	lat: null,
	lng: null,
	placeLabel: "",
	decade: null,
	year: null,
	visibility: "private",
	circleId: null,
};

export type Action =
	| { type: "patch"; patch: Partial<Draft> }
	| { type: "reset" }
	| { type: "replace"; draft: Draft };

export function reducer(state: Draft, action: Action): Draft {
	switch (action.type) {
		case "patch":
			return { ...state, ...action.patch };
		case "replace":
			return action.draft;
		case "reset":
			return initialDraft;
	}
}

export const STEPS = [
	{ n: 1, label: "Who’s telling" },
	{ n: 2, label: "Record" },
	{ n: 3, label: "Read it back" },
	{ n: 4, label: "Where and when" },
	{ n: 5, label: "Who can hear it" },
] as const;

const KEY = "hereabouts:record-draft:v1";

export function loadDraft(): Draft | null {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return null;
		return { ...initialDraft, ...(JSON.parse(raw) as Partial<Draft>) };
	} catch {
		return null;
	}
}
export function saveDraft(d: Draft) {
	try {
		localStorage.setItem(KEY, JSON.stringify(d));
	} catch {}
}
export function clearDraft() {
	try {
		localStorage.removeItem(KEY);
	} catch {}
}

export async function uploadAudio(blob: Blob, preview = false) {
	const form = new FormData();
	const ext = blob.type.includes("mp4") ? "m4a" : "webm";
	form.append("audio", blob, `memory.${ext}`);
	if (preview) form.append("preview", "1");
	const res = await fetch("/api/audio", { method: "POST", body: form });
	if (!res.ok) {
		const err = (await res.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(err?.error ?? "The recording could not be saved.");
	}
	return (await res.json()) as {
		audioFile: string | null;
		audioMime: string | null;
		transcript: string | null;
		language: string | null;
	};
}
