"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "#/lib/utils";
import { Tabs as TabsPrimitive } from "radix-ui";
import type * as React from "react";

function Tabs({
	className,
	orientation = "horizontal",
	...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
	return (
		<TabsPrimitive.Root
			data-slot="tabs"
			data-orientation={orientation}
			orientation={orientation}
			className={cn(
				"group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
				className,
			)}
			{...props}
		/>
	);
}

const tabsListVariants = cva(
	"group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-11 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none",
	{
		variants: {
			variant: {
				default: "bg-sunk ring-1 ring-line ring-inset",
				line: "h-auto! w-full justify-start gap-5 rounded-none border-b border-line p-0",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

function TabsList({
	className,
	variant = "default",
	...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
	VariantProps<typeof tabsListVariants>) {
	return (
		<TabsPrimitive.List
			data-slot="tabs-list"
			data-variant={variant}
			className={cn(tabsListVariants({ variant }), className)}
			{...props}
		/>
	);
}

function TabsTrigger({
	className,
	...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
	return (
		<TabsPrimitive.Trigger
			data-slot="tabs-trigger"
			className={cn(
				"relative inline-flex h-full items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap text-text-soft transition-colors outline-none hover:text-text focus-visible:outline-2 focus-visible:outline-gold disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				"group-data-[variant=default]/tabs-list:flex-1 group-data-[variant=default]/tabs-list:data-[state=active]:bg-raised-2 group-data-[variant=default]/tabs-list:data-[state=active]:text-text",
				"group-data-[variant=line]/tabs-list:h-10 group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:px-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:text-text",
				"after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-text after:opacity-0 after:transition-opacity group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
				className,
			)}
			{...props}
		/>
	);
}

function TabsContent({
	className,
	...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
	return (
		<TabsPrimitive.Content
			data-slot="tabs-content"
			className={cn("flex-1 outline-none", className)}
			{...props}
		/>
	);
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
