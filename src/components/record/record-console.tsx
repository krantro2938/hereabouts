import { CheckIcon, PauseIcon, PlayIcon } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { formatDuration } from "#/lib/decades";
import { cn } from "#/lib/utils";
import type { RecState } from "./use-recorder";

/** The recording console: record key, level meter bars and the elapsed time. */
export function RecordConsole({
	state,
	elapsedMs,
	levels,
	onStart,
	onPause,
	onResume,
	onFinish,
	busy,
}: {
	state: RecState;
	elapsedMs: number;
	levels: number[];
	onStart: () => void;
	onPause: () => void;
	onResume: () => void;
	onFinish: () => void;
	busy?: boolean;
}) {
	const live = state === "recording";
	const active = state === "recording" || state === "paused";
	const mmss = formatDuration(elapsedMs) || "0:00";

	return (
		<div className="panel flex flex-col items-center gap-6 px-5 py-6 sm:px-8 sm:py-8">
			<div className="flex w-full items-center justify-between">
				<span className="text-sm font-medium text-text-soft">Recorder</span>
				{live ? (
					<Badge variant="live">
						<span className="size-1.5 rounded-full bg-on-air" />
						On air
					</Badge>
				) : (
					<Badge variant="secondary">{active ? "Paused" : "Ready"}</Badge>
				)}
			</div>

			<div
				role="timer"
				aria-label="Time recorded"
				className="numerals text-[3.5rem] leading-none text-text sm:text-[4rem]"
			>
				{mmss}
			</div>

			{/* level meter: gold bars while recording, hatched when idle */}
			<div
				aria-hidden
				className="flex h-20 w-full items-end gap-[3px] rounded-xl bg-sunk px-3 py-2.5 ring-1 ring-line ring-inset"
			>
				{levels.map((l, i) => (
					<span
						// biome-ignore lint/suspicious/noArrayIndexKey: fixed bar row
						key={i}
						className={cn(
							"flex-1 rounded-[2px] transition-[height] duration-100",
							live ? "bg-gold" : "hatch",
						)}
						style={{
							height: `${Math.max(8, Math.round((live ? l : 0.12) * 100))}%`,
						}}
					/>
				))}
			</div>

			<button
				type="button"
				onClick={active ? onFinish : onStart}
				disabled={busy}
				aria-label={active ? "Finish recording" : "Start recording"}
				className={cn(
					"grid size-24 place-items-center rounded-full bg-on-air ring-4 ring-raised outline-none transition-transform duration-150 hover:brightness-110 focus-visible:ring-gold active:scale-95 disabled:opacity-50",
				)}
				style={live ? { animation: "on-air-pulse 1.6s infinite" } : undefined}
			>
				{active ? (
					<span className="size-8 rounded-[6px] bg-white" />
				) : (
					<span className="size-8 rounded-full bg-white" />
				)}
			</button>
			<p className="-mt-3 text-sm text-text-soft" aria-live="polite">
				{state === "idle" && "Press to start recording"}
				{state === "recording" && "Recording. Press to finish"}
				{state === "paused" && "Paused. Press to finish"}
			</p>

			<div className="flex min-h-10 gap-3">
				{active && (
					<>
						{state === "recording" ? (
							<Button type="button" variant="secondary" onClick={onPause}>
								<PauseIcon className="fill-current" />
								Pause
							</Button>
						) : (
							<Button type="button" variant="secondary" onClick={onResume}>
								<PlayIcon className="fill-current" />
								Resume
							</Button>
						)}
						<Button type="button" variant="gold" onClick={onFinish}>
							<CheckIcon />
							Finish
						</Button>
					</>
				)}
			</div>
		</div>
	);
}
