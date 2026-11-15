import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";
import { cn } from "#/lib/utils";

/**
 * Buttons follow the night-map kit: quiet charcoal by default, gold only for the
 * one action that matters on a screen ("Record", "Save memory"). `gold-soft` is the
 * tinted variant used in toolbars ("New recording"). Round icon buttons use
 * size "icon*" + variant "outline" (the close ✕, the → on cards).
 */
const buttonVariants = cva(
	"relative inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-sans font-medium whitespace-nowrap transition-[background-color,box-shadow,color,border-color] duration-150 outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				default:
					"bg-gold text-gold-ink hover:bg-[#f7dba6] active:bg-gold-strong",
				gold: "bg-gold text-gold-ink hover:bg-[#f7dba6] active:bg-gold-strong",
				"gold-soft":
					"bg-gold-tint text-gold ring-1 ring-gold/25 ring-inset hover:bg-gold/20",
				secondary:
					"bg-raised text-text ring-1 ring-line ring-inset hover:bg-raised-2",
				outline:
					"bg-transparent text-text ring-1 ring-line-strong ring-inset hover:bg-raised",
				ghost: "text-text-soft hover:bg-raised hover:text-text",
				amber: "bg-gold text-gold-ink hover:bg-[#f7dba6] active:bg-gold-strong",
				destructive:
					"bg-on-air/14 text-[#ff8a80] ring-1 ring-on-air/35 ring-inset hover:bg-on-air/22",
				link: "h-auto px-0 text-text underline decoration-text/30 decoration-1 underline-offset-4 hover:decoration-gold",
			},
			size: {
				default: "h-10 px-4 text-sm has-[>svg]:px-3.5",
				sm: "h-8 gap-1.5 px-3 text-[0.8125rem] has-[>svg]:px-2.5",
				lg: "h-12 px-6 text-[0.9375rem] has-[>svg]:px-5",
				xs: "h-7 gap-1 rounded-md px-2.5 text-xs has-[>svg]:px-2",
				icon: "size-10 rounded-full",
				"icon-sm": "size-8 rounded-full",
				"icon-xs": "size-7 rounded-full",
				"icon-lg": "size-12 rounded-full",
			},
		},
		defaultVariants: {
			variant: "secondary",
			size: "default",
		},
	},
);

function Button({
	className,
	variant = "secondary",
	size = "default",
	asChild = false,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot.Root : "button";

	return (
		<Comp
			data-slot="button"
			data-variant={variant}
			data-size={size}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
