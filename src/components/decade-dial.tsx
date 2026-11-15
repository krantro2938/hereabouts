import { useCallback, useRef, useState } from "react";
import { DECADE_HEX, DECADES, decadeLabel } from "#/lib/decades";
import { cn } from "#/lib/utils";

type Props = {
	/** first year of the tuned decade, or null for "all years" */
	value: number | null;
	onChange: (decade: number | null) => void;
	/** stories per decade — drawn as the histogram */
	counts?: Record<number, number>;
	className?: string;
	compact?: boolean;
};

const N = DECADES.length;

/**
 * The decade scrubber: a histogram of memories per decade that doubles as the
 * time control. Drag across it (or use arrow keys) to tune the map to a decade;
 * the tuned bar turns gold, the rest go hatched. "All years" lights every bar.
 * (Kept the DecadeDial name: every screen imports it.)
 */
export function DecadeDial({
	value,
	onChange,
	counts = {},
	className,
	compact,
}: Props) {
	const trackRef = useRef<HTMLDivElement>(null);
	const [dragging, setDragging] = useState(false);
	const index =
		value == null ? -1 : DECADES.indexOf(value as (typeof DECADES)[number]);
	const max = Math.max(1, ...Object.values(counts));
	const total = Object.values(counts).reduce((a, b) => a + b, 0);
	const shown = value == null ? total : (counts[value] ?? 0);

	const decadeAt = useCallback((clientX: number) => {
		const el = trackRef.current;
		if (!el) return DECADES[0];
		const r = el.getBoundingClientRect();
		const pct = Math.min(0.9999, Math.max(0, (clientX - r.left) / r.width));
		return DECADES[Math.floor(pct * N)];
	}, []);

	const onPointerDown = (e: React.PointerEvent) => {
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		setDragging(true);
		const d = decadeAt(e.clientX);
		if (d !== value) onChange(d);
	};
	const onPointerMove = (e: React.PointerEvent) => {
		if (!dragging) return;
		const d = decadeAt(e.clientX);
		if (d !== value) onChange(d);
	};
	const endDrag = () => setDragging(false);

	const onKeyDown = (e: React.KeyboardEvent) => {
		const i = index < 0 ? Math.floor(N / 2) - 1 : index;
		let next: number | null | undefined;
		if (e.key === "ArrowRight" || e.key === "ArrowUp")
			next = DECADES[Math.min(N - 1, index < 0 ? i : i + 1)];
		else if (e.key === "ArrowLeft" || e.key === "ArrowDown")
			next = DECADES[Math.max(0, index < 0 ? i : i - 1)];
		else if (e.key === "Home") next = DECADES[0];
		else if (e.key === "End") next = DECADES[N - 1];
		else if (e.key === "Escape" || e.key === "Delete" || e.key === "Backspace")
			next = null;
		if (next !== undefined) {
			e.preventDefault();
			onChange(next);
		}
	};

	const tuned = value == null ? "All years" : decadeLabel(value);

	return (
		<div
			className={cn(
				"rounded-2xl border border-line bg-panel/95 p-3.5 shadow-float backdrop-blur-md",
				compact && "p-2.5",
				className,
			)}
		>
			{!compact && (
				<div className="mb-3 flex items-center gap-3 px-0.5">
					<div className="min-w-0">
						<div className="text-xs text-text-faint">Listening to</div>
						<div className="flex items-baseline gap-2">
							<span className="numerals text-lg leading-tight text-text">
								{tuned}
							</span>
							<span className="text-[0.8125rem] text-text-soft">
								{shown} {shown === 1 ? "memory" : "memories"}
							</span>
						</div>
					</div>
					<button
						type="button"
						onClick={() => onChange(null)}
						aria-pressed={value == null}
						className={cn(
							"ml-auto inline-flex h-8 items-center gap-2 rounded-lg px-3 text-[0.8125rem] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-gold",
							value == null
								? "bg-gold-tint text-gold ring-1 ring-gold/30 ring-inset"
								: "bg-raised text-text-soft ring-1 ring-line ring-inset hover:text-text",
						)}
					>
						<span
							aria-hidden
							className={cn(
								"size-1.5 rounded-full",
								value == null ? "bg-gold" : "bg-text-faint",
							)}
						/>
						All years
					</button>
				</div>
			)}

			<div
				ref={trackRef}
				role="slider"
				tabIndex={0}
				aria-label="Tune to a decade"
				aria-valuemin={DECADES[0]}
				aria-valuemax={DECADES[N - 1]}
				aria-valuenow={value ?? undefined}
				aria-valuetext={tuned}
				onKeyDown={onKeyDown}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={endDrag}
				onPointerCancel={endDrag}
				className="relative cursor-ew-resize touch-none rounded-lg outline-none select-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-4 focus-visible:ring-offset-panel"
			>
				<div
					className={cn(
						"grid items-end gap-1.5",
						compact ? "h-9" : "h-[3.75rem]",
					)}
					style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}
				>
					{DECADES.map((d, i) => {
						const n = counts[d] ?? 0;
						const lit = value == null || i === index;
						const h = n ? 18 + (n / max) * 82 : 8;
						return (
							<div key={d} className="relative flex h-full items-end">
								{/* track */}
								<div className="absolute inset-0 rounded-[3px] bg-sunk" />
								<div
									className={cn(
										"relative w-full rounded-[3px] transition-[height,background-color,opacity] duration-300",
										!lit && "hatch bg-raised-2",
									)}
									style={{
										height: `${h}%`,
										background: lit
											? i === index
												? "var(--gold)"
												: "color-mix(in srgb, var(--gold) 72%, var(--panel))"
											: undefined,
									}}
								/>
								{i === index && (
									<span
										aria-hidden
										className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-full rounded-full"
										style={{ background: DECADE_HEX[d] }}
									/>
								)}
							</div>
						);
					})}
				</div>
				<div
					aria-hidden
					className="mt-1.5 grid gap-1.5"
					style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}
				>
					{DECADES.map((d, i) => (
						<span
							key={d}
							className={cn(
								"numerals text-center text-[0.6875rem] transition-colors",
								i === index ? "text-gold" : "text-text-faint",
							)}
						>
							{`’${String(d).slice(2)}`}
						</span>
					))}
				</div>
			</div>
		</div>
	);
}
