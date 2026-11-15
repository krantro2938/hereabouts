import { decadeColor, decadeLabel, whenLabel } from "#/lib/decades";
import { cn } from "#/lib/utils";

/**
 * A decade chip: a pill with a dot in the decade's colour (sepia for old
 * memories through gold to dusk blue for recent ones).
 */
export function DecadeTag({
	decade,
	year,
	className,
}: {
	decade: number;
	year?: number | null;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"numerals inline-flex items-center gap-1.5 rounded-full bg-raised py-0.5 pr-2.5 pl-2 text-xs font-medium text-text ring-1 ring-line-strong ring-inset",
				className,
			)}
			title={year ? `${year}` : decadeLabel(decade)}
		>
			<span
				aria-hidden
				className="size-2 rounded-full"
				style={{ background: decadeColor(decade) }}
			/>
			{year ? year : decadeLabel(decade)}
		</span>
	);
}

export { whenLabel };
