/** Geocoding via OpenStreetMap Nominatim (usage policy: ≤1 req/s, identify ourselves, cache). */

const UA = "Hereabouts/0.1 (Code for Change hackathon prototype)";
const cache = new Map<string, unknown>();
let last = 0;

async function politeFetch(url: string): Promise<unknown> {
	if (cache.has(url)) return cache.get(url);
	const wait = Math.max(0, last + 1100 - Date.now());
	if (wait) await new Promise((r) => setTimeout(r, wait));
	last = Date.now();
	const res = await fetch(url, {
		headers: { "User-Agent": UA, "Accept-Language": "en,nl;q=0.8" },
		signal: AbortSignal.timeout(10_000),
	});
	if (!res.ok) throw new Error(`nominatim ${res.status}`);
	const data = await res.json();
	cache.set(url, data);
	return data;
}

export type Place = { label: string; lat: number; lng: number };

type NominatimHit = {
	lat: string;
	lon: string;
	display_name: string;
	name?: string;
	address?: Record<string, string>;
};

function shortLabel(h: NominatimHit): string {
	const a = h.address ?? {};
	const street = a.road ?? a.pedestrian ?? a.square ?? a.neighbourhood;
	const named = h.name && h.name !== street ? h.name : undefined;
	const town = a.city ?? a.town ?? a.village ?? a.municipality;
	const parts = [
		named,
		street && a.house_number ? `${street} ${a.house_number}` : street,
		town,
	].filter(Boolean);
	return parts.length
		? parts.join(", ")
		: h.display_name.split(",").slice(0, 3).join(",");
}

export async function searchPlaces(
	query: string,
	near?: { lat: number; lng: number },
): Promise<Place[]> {
	const q = query.trim();
	if (q.length < 2) return [];
	const params = new URLSearchParams({
		q,
		format: "jsonv2",
		addressdetails: "1",
		limit: "5",
	});
	if (near) {
		const d = 0.25;
		params.set(
			"viewbox",
			`${near.lng - d},${near.lat + d},${near.lng + d},${near.lat - d}`,
		);
	}
	try {
		const hits = (await politeFetch(
			`https://nominatim.openstreetmap.org/search?${params}`,
		)) as NominatimHit[];
		return hits.map((h) => ({
			label: shortLabel(h),
			lat: Number(h.lat),
			lng: Number(h.lon),
		}));
	} catch (err) {
		console.warn("[geo] search failed:", (err as Error).message);
		return [];
	}
}

export async function reverseGeocode(
	lat: number,
	lng: number,
): Promise<string | null> {
	const params = new URLSearchParams({
		lat: lat.toFixed(5),
		lon: lng.toFixed(5),
		format: "jsonv2",
		zoom: "18",
		addressdetails: "1",
	});
	try {
		const h = (await politeFetch(
			`https://nominatim.openstreetmap.org/reverse?${params}`,
		)) as NominatimHit;
		return h?.display_name ? shortLabel(h) : null;
	} catch (err) {
		console.warn("[geo] reverse failed:", (err as Error).message);
		return null;
	}
}
