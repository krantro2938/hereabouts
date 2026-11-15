/** Decades the dial can tune to. 1930s is the oldest band; earlier memories fold into it. */
export const DECADES = [
	1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020,
] as const;
export type Decade = (typeof DECADES)[number];

export function clampDecade(d: number): Decade {
	const v = Math.floor(d / 10) * 10;
	if (v <= DECADES[0]) return DECADES[0];
	if (v >= DECADES[DECADES.length - 1]) return DECADES[DECADES.length - 1];
	return v as Decade;
}

/** CSS colour for a decade: older memories are faded, recent ones vivid. */
export function decadeColor(decade: number): string {
	return `var(--decade-${clampDecade(decade)})`;
}

/** Hex twins of the --decade-* tokens, for MapLibre/canvas (which can't read CSS vars). */
export const DECADE_HEX: Record<Decade, string> = {
	1930: "#b08a72",
	1940: "#c09a74",
	1950: "#d3ae7a",
	1960: "#e3c483",
	1970: "#e0d38e",
	1980: "#b9d595",
	1990: "#8fcfae",
	2000: "#7cc1cb",
	2010: "#85a9e2",
	2020: "#a39bea",
};

export function decadeLabel(decade: number, short = false): string {
	const d = clampDecade(decade);
	if (decade < 1930) return short ? "pre-’30s" : "Before 1930";
	return short ? `’${String(d).slice(2)}s` : `${d}s`;
}

/** "1974" when we know the year, otherwise "the 1970s". */
export function whenLabel(decade: number, year?: number | null): string {
	return year ? String(year) : `the ${decadeLabel(decade)}`;
}

export function formatDuration(ms: number | null | undefined): string {
	if (!ms) return "";
	const s = Math.round(ms / 1000);
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Hex values for the night map style (MapLibre can't read CSS variables). */
export const MAP_HEX = {
	land: "#17181a",
	landSoft: "#1a1b1e",
	park: "#1b1f1d",
	water: "#0f1012",
	building: "#1f2023",
	road: "#2b2c30",
	roadMajor: "#36373c",
	roadCasing: "#202124",
	rail: "#2e2f33",
	label: "#8b8c93",
	labelStrong: "#b4b5bb",
	labelHalo: "#141517",
	boundary: "#3a3b40",
	panel: "#1b1c1f",
	raised: "#232427",
	cluster: "#3a3b40",
	text: "#ededef",
	gold: "#f3d08e",
} as const;
