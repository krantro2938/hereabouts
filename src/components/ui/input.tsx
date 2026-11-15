import type * as React from "react";
import { cn } from "#/lib/utils";

/** Inputs: raised charcoal field, hairline ring, gold ring on focus. */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(
				"flex h-10 w-full min-w-0 rounded-lg bg-raised px-3.5 py-2 font-sans text-[0.9375rem] text-text ring-1 ring-line-strong transition-[box-shadow,background-color] outline-none ring-inset placeholder:text-text-faint selection:bg-amber/40 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-semibold disabled:cursor-not-allowed disabled:opacity-50",
				"focus-visible:bg-raised focus-visible:ring-2 focus-visible:ring-gold/70",
				"aria-invalid:ring-2 aria-invalid:ring-on-air/70",
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
