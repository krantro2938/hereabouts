import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";
import { cn } from "#/lib/utils";

/**
 * Badges are pills: a raised chip with a hairline ring. For decades use <DecadeTag>
 * (components/decade.tsx); for visibility use the status dot variants.
 */
const badgeVariants = cva(
	"inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full px-2.5 py-0.5 font-sans text-xs font-medium whitespace-nowrap ring-1 ring-inset [&>svg]:pointer-events-none [&>svg]:size-3.5",
	{
		variants: {
			variant: {
				default: "bg-raised text-text ring-line-strong",
				secondary: "bg-raised text-text-soft ring-line",
				outline: "text-text-soft ring-line-strong",
				amber: "rounded-md bg-gold-tint text-gold ring-gold/30",
				gold: "rounded-md bg-gold-tint text-gold ring-gold/30",
				destructive: "bg-on-air/14 text-[#ff8a80] ring-on-air/30",
				live: "bg-gold-tint text-gold ring-gold/40",
			},
		},
		defaultVariants: { variant: "default" },
	},
);

function Badge({
	className,
	variant = "default",
	asChild = false,
	...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
	const Comp = asChild ? Slot.Root : "span";
	return (
		<Comp
			data-slot="badge"
			data-variant={variant}
			className={cn(badgeVariants({ variant }), className)}
			{...props}
		/>
	);
}

export { Badge, badgeVariants };
