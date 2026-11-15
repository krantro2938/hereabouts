import type * as React from "react";
import { cn } from "#/lib/utils";

/** Long-form writing surface: set in the story serif so editing feels like the final page. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				"flex field-sizing-content min-h-28 w-full rounded-lg bg-raised px-4 py-3 font-serif text-[1.05rem] leading-relaxed text-text ring-1 ring-line-strong transition-[box-shadow,background-color] outline-none ring-inset placeholder:text-text-faint disabled:cursor-not-allowed disabled:opacity-50",
				"focus-visible:bg-raised focus-visible:ring-2 focus-visible:ring-gold/70",
				"aria-invalid:ring-2 aria-invalid:ring-on-air/70",
				className,
			)}
			{...props}
		/>
	);
}

export { Textarea };
