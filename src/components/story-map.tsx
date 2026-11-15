import { ArrowRightIcon } from "lucide-react";
import type {
	ExpressionSpecification,
	GeoJSONSource,
	MapLayerMouseEvent,
	MapMouseEvent,
	Marker,
	Map as MlMap,
	StyleSpecification,
} from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { DECADE_HEX, DECADES, formatDuration, MAP_HEX } from "#/lib/decades";
import { cn } from "#/lib/utils";

export type MapPin = {
	id: string;
	lat: number;
	lng: number;
	decade: number;
	title: string;
	hasAudio?: boolean;
	/** shown in the hover card when present */
	placeLabel?: string;
	storytellerName?: string;
	durationMs?: number | null;
	year?: number | null;
};

type Props = {
	pins?: MapPin[];
	/** decade the dial is tuned to; pins from other decades fade to ghosts. null = all */
	activeDecade?: number | null;
	selectedId?: string | null;
	onSelect?: (id: string | null) => void;
	/** initial view; ignored once `fitPins` has run */
	center?: { lat: number; lng: number };
	zoom?: number;
	/** fit the view around the pins on first load */
	fitPins?: boolean;
	/** place-picker mode: shows a draggable pin and reports clicks/drags */
	pick?: { lat: number; lng: number } | null;
	onPick?: (p: { lat: number; lng: number }) => void;
	/** fly here whenever it changes */
	flyTo?: { lat: number; lng: number; zoom?: number } | null;
	interactive?: boolean;
	/** px to lift the bottom map controls (attribution) above an overlay like the docked dial */
	bottomInset?: number;
	className?: string;
};

export const DEFAULT_CENTER = { lat: 52.0907, lng: 5.1214 }; // Utrecht, where the sample stories live
const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

let stylePromise: Promise<StyleSpecification> | null = null;

/** Recolour OpenFreeMap Positron into the Hereabouts night map. */
function loadStyle(): Promise<StyleSpecification> {
	stylePromise ??= fetch(STYLE_URL)
		.then((r) => r.json() as Promise<StyleSpecification>)
		.then((style) => {
			for (const layer of style.layers) {
				const id = layer.id;
				const l = layer as { paint?: Record<string, unknown> };
				l.paint ??= {};
				const paint = l.paint;
				if (layer.type === "background")
					paint["background-color"] = MAP_HEX.land;
				else if (layer.type === "fill") {
					if (/water/.test(id)) paint["fill-color"] = MAP_HEX.water;
					else if (/park|wood|grass|landcover/.test(id))
						paint["fill-color"] = MAP_HEX.park;
					else if (/building/.test(id)) {
						paint["fill-color"] = MAP_HEX.building;
						paint["fill-outline-color"] = MAP_HEX.roadCasing;
					} else if (/residential|landuse/.test(id))
						paint["fill-color"] = MAP_HEX.landSoft;
					else if (/aeroway|pier/.test(id)) paint["fill-color"] = MAP_HEX.road;
				} else if (layer.type === "line") {
					if (/water|river|stream|canal/.test(id))
						paint["line-color"] = MAP_HEX.water;
					else if (/casing/.test(id)) paint["line-color"] = MAP_HEX.roadCasing;
					else if (/boundary/.test(id)) paint["line-color"] = MAP_HEX.boundary;
					else if (/rail/.test(id)) paint["line-color"] = MAP_HEX.rail;
					else if (/major|motorway/.test(id))
						paint["line-color"] = MAP_HEX.roadMajor;
					else if (
						/highway|road|street|path|bridge|tunnel|aeroway|pier/.test(id)
					)
						paint["line-color"] = MAP_HEX.road;
				} else if (layer.type === "symbol") {
					paint["text-color"] = /label_(city|town)/.test(id)
						? MAP_HEX.labelStrong
						: MAP_HEX.label;
					paint["text-halo-color"] = MAP_HEX.labelHalo;
					paint["text-halo-width"] = 1.2;
					if (/shield/.test(id))
						(layer as { layout?: Record<string, unknown> }).layout = {
							...(layer as { layout?: Record<string, unknown> }).layout,
							visibility: "none",
						};
				}
			}
			return style;
		})
		.catch((err) => {
			stylePromise = null;
			throw err;
		});
	return stylePromise;
}

/** A three-bar waveform drawn once into the map's sprite: the glyph inside every pin. */
function waveIcon(px: number) {
	const c = document.createElement("canvas");
	c.width = c.height = px;
	const g = c.getContext("2d");
	if (!g) return null;
	g.fillStyle = "#ffffff";
	const bars = [0.38, 0.72, 0.5];
	const w = px * 0.13;
	const gap = px * 0.1;
	const total = bars.length * w + (bars.length - 1) * gap;
	bars.forEach((h, i) => {
		const x = (px - total) / 2 + i * (w + gap);
		const bh = px * h;
		g.beginPath();
		g.roundRect(x, (px - bh) / 2, w, bh, w / 2);
		g.fill();
	});
	return g.getImageData(0, 0, px, px);
}

const decadeColorExpr = [
	"match",
	["get", "decade"],
	...DECADES.flatMap((d) => [d, DECADE_HEX[d]]),
	DECADE_HEX[1930],
] as unknown as string;

function toGeoJSON(
	pins: MapPin[],
	active: number | null | undefined,
	selected: string | null | undefined,
) {
	return {
		type: "FeatureCollection" as const,
		features: pins.map((p) => ({
			type: "Feature" as const,
			id: p.id,
			geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
			properties: {
				id: p.id,
				decade: Math.max(1930, Math.min(2020, Math.floor(p.decade / 10) * 10)),
				title: p.title,
				tuned:
					active == null || Math.floor(p.decade / 10) * 10 === active ? 1 : 0,
				selected: p.id === selected ? 1 : 0,
			},
		})),
	};
}

/**
 * The memory map. Pins are coloured by decade (faded = older). Tuning the dial
 * ghosts every pin outside the chosen decade instead of hiding it, so the town
 * never looks empty.
 */
export function StoryMap({
	pins = [],
	activeDecade,
	selectedId,
	onSelect,
	center = DEFAULT_CENTER,
	zoom = 13.2,
	fitPins,
	pick,
	onPick,
	flyTo,
	interactive = true,
	bottomInset = 0,
	className,
}: Props) {
	const el = useRef<HTMLDivElement>(null);
	const map = useRef<MlMap | null>(null);
	const pickMarker = useRef<Marker | null>(null);
	const [ready, setReady] = useState(false);
	const [failed, setFailed] = useState(false);
	const latest = useRef({ onSelect, onPick });
	latest.current = { onSelect, onPick };
	const fitted = useRef(false);
	const pinsById = useRef(new Map<string, MapPin>());
	pinsById.current = new Map(pins.map((p) => [p.id, p]));
	const [hover, setHover] = useState<{
		pin: MapPin;
		x: number;
		y: number;
	} | null>(null);

	// create the map once; later prop changes are applied by the effects below
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally mount-only
	useEffect(() => {
		let disposed = false;
		(async () => {
			try {
				const [maplibregl, worker, style] = await Promise.all([
					import("maplibre-gl"),
					import("maplibre-gl/dist/maplibre-gl-worker.mjs?url"),
					loadStyle(),
				]);
				// Vite pre-bundles maplibre, which breaks its relative worker lookup — point it at the real file.
				maplibregl.setWorkerUrl(worker.default);
				if (disposed || !el.current) return;
				const m = new maplibregl.Map({
					container: el.current,
					style,
					center: [center.lng, center.lat],
					zoom,
					interactive,
					attributionControl: { compact: true },
					dragRotate: false,
					pitchWithRotate: false,
				});
				m.touchZoomRotate.disableRotation();
				if (interactive)
					m.addControl(
						new maplibregl.NavigationControl({ showCompass: false }),
						"top-right",
					);
				map.current = m;
				m.on("load", () => {
					// start the compact attribution collapsed; the (i) button still opens it
					m.getContainer()
						.querySelector(".maplibregl-ctrl-attrib")
						?.classList.remove("maplibregl-compact-show");
					const icon = waveIcon(64);
					if (icon) m.addImage("pin-wave", icon, { pixelRatio: 4 });
					m.addSource("stories", {
						type: "geojson",
						data: toGeoJSON([], null, null),
						cluster: true,
						clusterRadius: 38,
						clusterMaxZoom: 14,
						clusterProperties: { tuned: ["+", ["get", "tuned"]] },
					});
					const unclustered: ExpressionSpecification = [
						"!",
						["has", "point_count"],
					];
					const isTuned: ExpressionSpecification = ["==", ["get", "tuned"], 1];
					// clusters: grey discs with a count, ghosted when nothing inside is tuned in
					m.addLayer({
						id: "story-clusters",
						type: "circle",
						source: "stories",
						filter: ["has", "point_count"],
						paint: {
							"circle-color": MAP_HEX.cluster,
							"circle-radius": [
								"step",
								["get", "point_count"],
								15,
								5,
								18,
								12,
								22,
							],
							"circle-opacity": ["case", [">", ["get", "tuned"], 0], 0.95, 0.4],
							"circle-stroke-color": MAP_HEX.land,
							"circle-stroke-width": 3,
						},
					});
					m.addLayer({
						id: "story-cluster-count",
						type: "symbol",
						source: "stories",
						filter: ["has", "point_count"],
						layout: {
							"text-field": ["get", "point_count_abbreviated"],
							"text-font": ["Noto Sans Bold"],
							"text-size": 12.5,
							"text-allow-overlap": true,
						},
						paint: {
							"text-color": MAP_HEX.text,
							"text-opacity": ["case", [">", ["get", "tuned"], 0], 1, 0.45],
						},
					});
					// gold glow under the selected pin
					m.addLayer({
						id: "story-halo",
						type: "circle",
						source: "stories",
						filter: ["all", unclustered, ["==", ["get", "selected"], 1]],
						paint: {
							"circle-radius": 22,
							"circle-color": MAP_HEX.gold,
							"circle-opacity": 0.22,
							"circle-stroke-color": MAP_HEX.gold,
							"circle-stroke-width": 1.5,
							"circle-stroke-opacity": 0.8,
						},
					});
					// pins: a dark disc with a decade-coloured ring (old = sepia, recent = dusk blue)
					m.addLayer({
						id: "story-pins",
						type: "circle",
						source: "stories",
						filter: unclustered,
						layout: {
							"circle-sort-key": [
								"+",
								["get", "tuned"],
								["*", 2, ["get", "selected"]],
							],
						},
						paint: {
							"circle-color": MAP_HEX.panel,
							"circle-radius": [
								"interpolate",
								["linear"],
								["zoom"],
								10,
								["case", isTuned, 8, 5],
								14,
								["case", isTuned, 12.5, 8],
								17,
								["case", isTuned, 14, 9],
							],
							"circle-opacity": ["case", isTuned, 1, 0.55],
							"circle-stroke-color": decadeColorExpr,
							"circle-stroke-width": ["case", isTuned, 2, 1.25],
							"circle-stroke-opacity": ["case", isTuned, 1, 0.4],
						},
					});
					m.addLayer({
						id: "story-pin-icons",
						type: "symbol",
						source: "stories",
						filter: unclustered,
						layout: {
							"icon-image": "pin-wave",
							"icon-size": [
								"interpolate",
								["linear"],
								["zoom"],
								10,
								["case", isTuned, 0.65, 0],
								14,
								["case", isTuned, 1, 0.6],
							],
							"icon-allow-overlap": true,
							"icon-ignore-placement": true,
							"symbol-sort-key": ["get", "tuned"],
						},
						paint: { "icon-opacity": ["case", isTuned, 0.95, 0.35] },
					});
					m.on("click", "story-clusters", async (e: MapLayerMouseEvent) => {
						e.preventDefault();
						const f = e.features?.[0];
						const src = m.getSource("stories") as GeoJSONSource | undefined;
						if (!f || !src) return;
						const z = await src.getClusterExpansionZoom(
							f.properties?.cluster_id as number,
						);
						m.easeTo({
							center: (f.geometry as { coordinates: [number, number] })
								.coordinates,
							zoom: z + 0.3,
						});
					});
					m.on("mousemove", "story-pins", (e: MapLayerMouseEvent) => {
						const id = e.features?.[0]?.properties?.id as string | undefined;
						const pin = id ? pinsById.current.get(id) : undefined;
						if (!pin) return;
						const pt = m.project([pin.lng, pin.lat]);
						setHover((h) =>
							h?.pin.id === pin.id && h.x === pt.x
								? h
								: { pin, x: pt.x, y: pt.y },
						);
					});
					m.on("mouseleave", "story-pins", () => setHover(null));
					m.on("movestart", () => setHover(null));
					for (const layer of ["story-clusters", "story-pins"]) {
						m.on("mouseenter", layer, () => {
							m.getCanvas().style.cursor = "pointer";
						});
						m.on("mouseleave", layer, () => {
							m.getCanvas().style.cursor = "";
						});
					}
					m.on("click", "story-pins", (e: MapLayerMouseEvent) => {
						const id = e.features?.[0]?.properties?.id as string | undefined;
						if (id) {
							e.preventDefault();
							latest.current.onSelect?.(id);
						}
					});
					m.on("click", (e: MapMouseEvent) => {
						if (e.defaultPrevented) return;
						if (latest.current.onPick)
							latest.current.onPick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
						else latest.current.onSelect?.(null);
					});
					setReady(true);
				});
			} catch (err) {
				console.warn("[map] failed to load", err);
				if (!disposed) setFailed(true);
			}
		})();
		return () => {
			disposed = true;
			map.current?.remove();
			map.current = null;
		};
	}, []);

	// keep pins in sync
	useEffect(() => {
		const m = map.current;
		if (!ready || !m) return;
		(m.getSource("stories") as GeoJSONSource | undefined)?.setData(
			toGeoJSON(pins, activeDecade, selectedId),
		);
		if (fitPins && !fitted.current && pins.length > 1) {
			fitted.current = true;
			let [w, s, e, n] = [180, 90, -180, -90];
			for (const p of pins) {
				w = Math.min(w, p.lng);
				e = Math.max(e, p.lng);
				s = Math.min(s, p.lat);
				n = Math.max(n, p.lat);
			}
			m.fitBounds(
				[
					[w, s],
					[e, n],
				],
				{ padding: 70, maxZoom: 15, duration: 0 },
			);
		}
	}, [ready, pins, activeDecade, selectedId, fitPins]);

	// place picker marker
	useEffect(() => {
		const m = map.current;
		if (!ready || !m) return;
		if (!pick) {
			pickMarker.current?.remove();
			pickMarker.current = null;
			return;
		}
		(async () => {
			const maplibregl = await import("maplibre-gl");
			if (!pickMarker.current) {
				const node = document.createElement("div");
				node.className = "hb-pick-marker";
				node.innerHTML = `<svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true"><path d="M17 43s15-14.6 15-26A15 15 0 0 0 2 17c0 11.4 15 26 15 26Z" fill="${MAP_HEX.gold}" stroke="${MAP_HEX.land}" stroke-width="2"/><circle cx="17" cy="17" r="5.5" fill="${MAP_HEX.land}"/></svg>`;
				const marker = new maplibregl.Marker({
					element: node,
					draggable: true,
					anchor: "bottom",
				})
					.setLngLat([pick.lng, pick.lat])
					.addTo(m);
				pickMarker.current = marker;
				marker.on("dragend", () => {
					const ll = marker.getLngLat();
					if (ll) latest.current.onPick?.({ lat: ll.lat, lng: ll.lng });
				});
			} else {
				pickMarker.current.setLngLat([pick.lng, pick.lat]);
			}
		})();
	}, [ready, pick]);

	// re-measure whenever the container changes size (sheets opening, layout settling after mount)
	useEffect(() => {
		const node = el.current;
		if (!ready || !node) return;
		const ro = new ResizeObserver(() => map.current?.resize());
		ro.observe(node);
		return () => ro.disconnect();
	}, [ready]);

	useEffect(() => {
		if (!ready || !flyTo) return;
		map.current?.flyTo({
			center: [flyTo.lng, flyTo.lat],
			zoom: flyTo.zoom ?? Math.max(map.current.getZoom(), 15),
			speed: 1.4,
		});
	}, [ready, flyTo]);

	return (
		<div
			className={cn("relative overflow-hidden bg-map", className)}
			style={{ "--hb-ctrl-bottom": `${bottomInset}px` } as React.CSSProperties}
		>
			{/* inline style: maplibre’s own .maplibregl-map sets position:relative, which would collapse a class-based inset */}
			<div ref={el} style={{ position: "absolute", inset: 0 }} />
			{hover && interactive && (
				<PinCard
					pin={hover.pin}
					x={hover.x}
					y={hover.y}
					onOpen={() => {
						setHover(null);
						latest.current.onSelect?.(hover.pin.id);
					}}
					onLeave={() => setHover(null)}
				/>
			)}
			{failed && (
				<div className="absolute inset-0 flex items-center justify-center p-6 text-center text-text-soft">
					The map couldn’t load. Check your connection and refresh the page.
				</div>
			)}
		</div>
	);
}

/**
 * Hover card: a gold-outlined slip next to the pin, like a tuned-in station.
 * Title pill with the decade dot, the place, then who told it and how long it runs.
 */
function PinCard({
	pin,
	x,
	y,
	onOpen,
	onLeave,
}: {
	pin: MapPin;
	x: number;
	y: number;
	onOpen: () => void;
	onLeave: () => void;
}) {
	const decade = Math.max(
		1930,
		Math.min(2020, Math.floor(pin.decade / 10) * 10),
	);
	return (
		<button
			type="button"
			onClick={onOpen}
			onMouseLeave={onLeave}
			className="absolute z-10 w-[18rem] -translate-y-1/2 rounded-xl border border-gold-line bg-panel p-3 text-left shadow-float outline-none focus-visible:ring-2 focus-visible:ring-gold"
			style={{ left: x + 20, top: y }}
		>
			<span className="flex items-center gap-2">
				<span className="flex min-w-0 items-center gap-2 rounded-full bg-raised px-2.5 py-1">
					<span className="truncate text-sm font-medium text-text">
						{pin.title}
					</span>
					<span
						className="size-2 shrink-0 rounded-full"
						style={{
							background: DECADE_HEX[decade as keyof typeof DECADE_HEX],
						}}
					/>
				</span>
				<span className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-text-soft ring-1 ring-line-strong">
					{pin.year ?? `’${String(decade).slice(2)}s`}
				</span>
			</span>
			{pin.placeLabel && (
				<span className="mt-2 block truncate px-0.5 text-[0.8125rem] text-text-soft">
					{pin.placeLabel}
				</span>
			)}
			{(pin.storytellerName || pin.durationMs) && (
				<span className="mt-3 flex items-end gap-5 px-0.5">
					{pin.storytellerName && (
						<span className="min-w-0">
							<span className="block text-xs text-text-faint">Told by</span>
							<span className="block truncate text-sm font-semibold text-text">
								{pin.storytellerName}
							</span>
						</span>
					)}
					{pin.durationMs ? (
						<span>
							<span className="block text-xs text-text-faint">Length</span>
							<span className="numerals block text-sm text-text">
								{formatDuration(pin.durationMs)}
							</span>
						</span>
					) : null}
					<span className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-full text-text ring-1 ring-line-strong">
						<ArrowRightIcon className="size-4" />
					</span>
				</span>
			)}
		</button>
	);
}
