import { PauseIcon, PlayIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { formatDuration } from "#/lib/decades";
import { cn } from "#/lib/utils";

const BARS = 56;

/** Decode the recording once and reduce it to `BARS` peak heights (0–1). */
async function loadPeaks(src: string): Promise<number[]> {
	const buf = await (await fetch(src)).arrayBuffer();
	const ctx = new AudioContext();
	try {
		const audio = await ctx.decodeAudioData(buf);
		const data = audio.getChannelData(0);
		const step = Math.max(1, Math.floor(data.length / BARS));
		const peaks: number[] = [];
		for (let i = 0; i < BARS; i++) {
			let max = 0;
			for (let j = i * step; j < Math.min(data.length, (i + 1) * step); j += 16)
				max = Math.max(max, Math.abs(data[j]));
			peaks.push(max);
		}
		const top = Math.max(0.01, ...peaks);
		return peaks.map((p) => Math.max(0.08, Math.sqrt(p / top)));
	} finally {
		ctx.close();
	}
}

/** Gentle placeholder silhouette while peaks load (deterministic per src). */
function placeholderPeaks(seed: string): number[] {
	let h = 0;
	for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
	return Array.from({ length: BARS }, (_, i) => {
		h = (h * 1103515245 + 12345) >>> 0;
		return 0.25 + 0.35 * Math.abs(Math.sin(i / 5)) + ((h % 100) / 100) * 0.25;
	});
}

/**
 * The storyteller's voice, drawn like a usage chart: vertical bars from the real
 * waveform, the played part solid gold and the rest hatched, with a blue "now" tag
 * at the playhead. Click, drag or arrow-key the chart to seek.
 */
export function AudioPlayer({
	src,
	durationMs,
	className,
	size = "md",
	label = "Play recording",
}: {
	src: string;
	durationMs?: number | null;
	className?: string;
	size?: "sm" | "md";
	label?: string;
}) {
	const audio = useRef<HTMLAudioElement>(null);
	const [playing, setPlaying] = useState(false);
	const [t, setT] = useState(0);
	const [dur, setDur] = useState((durationMs ?? 0) / 1000);
	const fallback = useMemo(() => placeholderPeaks(src), [src]);
	const [peaks, setPeaks] = useState<number[]>(fallback);
	const dragging = useRef(false);

	useEffect(() => {
		let live = true;
		loadPeaks(src)
			.then((p) => live && setPeaks(p))
			.catch(() => {});
		return () => {
			live = false;
		};
	}, [src]);

	useEffect(() => {
		const a = audio.current;
		if (!a) return;
		let raf = 0;
		const tick = () => {
			setT(a.currentTime);
			raf = requestAnimationFrame(tick);
		};
		const onPlay = () => {
			setPlaying(true);
			raf = requestAnimationFrame(tick);
		};
		const onPause = () => {
			setPlaying(false);
			cancelAnimationFrame(raf);
			setT(a.currentTime);
		};
		const onMeta = () =>
			Number.isFinite(a.duration) && a.duration > 0 && setDur(a.duration);
		a.addEventListener("play", onPlay);
		a.addEventListener("pause", onPause);
		a.addEventListener("ended", onPause);
		a.addEventListener("loadedmetadata", onMeta);
		a.addEventListener("durationchange", onMeta);
		return () => {
			cancelAnimationFrame(raf);
			a.removeEventListener("play", onPlay);
			a.removeEventListener("pause", onPause);
			a.removeEventListener("ended", onPause);
			a.removeEventListener("loadedmetadata", onMeta);
			a.removeEventListener("durationchange", onMeta);
		};
	}, []);

	const progress = dur ? Math.min(1, t / dur) : 0;
	const seek = (frac: number) => {
		const a = audio.current;
		if (!a || !dur) return;
		a.currentTime = Math.max(0, Math.min(dur, frac * dur));
		setT(a.currentTime);
	};
	const toggle = () =>
		playing ? audio.current?.pause() : audio.current?.play();
	const small = size === "sm";
	const showNow = progress > 0 && progress < 1;
	const cur = Math.min(BARS - 1, Math.floor(progress * BARS));

	const playButton = (
		<Button
			type="button"
			variant="gold"
			size={small ? "icon" : "icon-lg"}
			onClick={toggle}
			aria-label={playing ? "Pause" : label}
		>
			{playing ? (
				<PauseIcon className="fill-current" />
			) : (
				<PlayIcon className="translate-x-px fill-current" />
			)}
		</Button>
	);

	const chart = (
		<div
			role="slider"
			tabIndex={0}
			aria-label="Seek"
			aria-valuemin={0}
			aria-valuemax={Math.round(dur)}
			aria-valuenow={Math.round(t)}
			aria-valuetext={`${formatDuration(t * 1000) || "0:00"} of ${formatDuration(dur * 1000)}`}
			className={cn(
				"relative flex cursor-pointer touch-none items-stretch gap-[2px] rounded-md outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-4 focus-visible:ring-offset-panel",
				small ? "h-9 min-w-0 flex-1" : "h-[72px] w-full",
			)}
			onPointerDown={(e) => {
				dragging.current = true;
				e.currentTarget.setPointerCapture(e.pointerId);
				const r = e.currentTarget.getBoundingClientRect();
				seek((e.clientX - r.left) / r.width);
			}}
			onPointerMove={(e) => {
				if (!dragging.current) return;
				const r = e.currentTarget.getBoundingClientRect();
				seek((e.clientX - r.left) / r.width);
			}}
			onPointerUp={() => {
				dragging.current = false;
			}}
			onPointerCancel={() => {
				dragging.current = false;
			}}
			onKeyDown={(e) => {
				if (e.key === "ArrowRight") seek((t + 5) / dur);
				else if (e.key === "ArrowLeft") seek((t - 5) / dur);
				else if (e.key === "Home") seek(0);
				else if (e.key === "End") seek(1);
				else if (e.key === " " || e.key === "Enter") {
					e.preventDefault();
					toggle();
				}
			}}
		>
			{peaks.map((p, i) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: fixed-length bar list
					key={i}
					className="relative flex min-w-0 flex-1 items-end rounded-[3px] bg-sunk"
				>
					<span
						className={cn(
							"w-full rounded-[3px]",
							i / BARS < progress ? "bg-gold" : "hatch bg-raised",
						)}
						style={{ height: `${Math.round(p * 100)}%` }}
					/>
					{showNow && i === cur && !small && (
						<span
							aria-hidden
							className="pointer-events-none absolute -top-[22px] left-1/2 -translate-x-1/2 rounded bg-now px-1.5 py-px text-[0.625rem] leading-4 font-semibold text-white after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-x-4 after:border-t-4 after:border-x-transparent after:border-t-now"
						>
							now
						</span>
					)}
				</span>
			))}
		</div>
	);

	if (small) {
		return (
			<div className={cn("flex items-center gap-3", className)}>
				{/* biome-ignore lint/a11y/useMediaCaption: transcript is shown alongside every recording */}
				<audio ref={audio} src={src} preload="metadata" />
				{playButton}
				{chart}
				<span className="numerals w-[5ch] shrink-0 text-right text-sm text-text-soft">
					{formatDuration((playing || t > 0 ? t : dur) * 1000) || "0:00"}
				</span>
			</div>
		);
	}

	return (
		<div className={cn("flex flex-col gap-3", className)}>
			{/* biome-ignore lint/a11y/useMediaCaption: transcript is shown alongside every recording */}
			<audio ref={audio} src={src} preload="metadata" />
			<div className="pt-6">{chart}</div>
			<div className="flex items-center gap-3">
				{playButton}
				<span className="numerals text-sm text-text">
					{formatDuration(t * 1000) || "0:00"}
				</span>
				<span className="numerals ml-auto text-sm text-text-faint">
					{formatDuration(dur * 1000) || "0:00"}
				</span>
			</div>
		</div>
	);
}
