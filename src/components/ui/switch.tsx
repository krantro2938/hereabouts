import { cn } from "#/lib/utils";
import { Switch as SwitchPrimitive } from "radix-ui";
import type * as React from "react";

function Switch({
	className,
	size = "default",
	...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
	size?: "sm" | "default";
}) {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			data-size={size}
			className={cn(
				"peer group/switch inline-flex cursor-pointer shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-6 data-[size=default]:w-11 data-[size=sm]:h-3.5 data-[size=sm]:w-6 data-[state=checked]:bg-primary data-[state=unchecked]:bg-raised-2",
				className,
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className={cn(
					"pointer-events-none block rounded-full bg-text ring-0 transition-transform group-data-[size=default]/switch:size-5 shadow-key-light group-data-[size=sm]/switch:size-3 data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0 data-[state=checked]:bg-gold-ink",
				)}
			/>
		</SwitchPrimitive.Root>
	);
}

export { Switch };
