import { cn } from "#/lib/utils";

/**
 * The mark: an H drawn as a sound wave — two tall bars and a gold middle
 * bar on the crossbar — set in a charcoal tile.
 */
export function Glyph({ className }: { className?: string }) {
	return (
		<span
			className={cn(
				"inline-flex size-8 items-center justify-center rounded-lg bg-raised ring-1 ring-line-strong ring-inset",
				className,
			)}
			aria-hidden
		>
			<svg viewBox="0 0 20 20" className="size-[62%]">
				<rect x="2" y="2" width="3.4" height="16" rx="1.7" fill="var(--text)" />
				<rect
					x="14.6"
					y="2"
					width="3.4"
					height="16"
					rx="1.7"
					fill="var(--text)"
				/>
				<rect
					x="4"
					y="8.9"
					width="12"
					height="2.2"
					rx="1.1"
					fill="var(--text)"
				/>
				<rect
					x="8.3"
					y="5.5"
					width="3.4"
					height="9"
					rx="1.7"
					fill="var(--gold)"
				/>
			</svg>
		</span>
	);
}

export function Wordmark({ className }: { className?: string }) {
	return (
		<span
			className={cn("inline-flex items-center gap-2.5 text-text", className)}
		>
			<Glyph />
			<span className="text-[1.0625rem] leading-none font-semibold tracking-[-0.02em]">
				Hereabouts
			</span>
		</span>
	);
}
