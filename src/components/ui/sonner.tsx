"use client";

import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/** Toasts: a raised panel with a hairline ring. */
const Toaster = ({ ...props }: ToasterProps) => (
	<Sonner
		theme="dark"
		className="toaster group"
		icons={{
			success: <CircleCheckIcon className="size-4 text-gold" />,
			info: <InfoIcon className="size-4" />,
			warning: <TriangleAlertIcon className="size-4 text-gold" />,
			error: <OctagonXIcon className="size-4 text-on-air" />,
			loading: <Loader2Icon className="size-4 animate-spin" />,
		}}
		toastOptions={{ style: { fontFamily: "var(--font-sans)", fontSize: "0.95rem" } }}
		style={
			{
				"--normal-bg": "var(--raised)",
				"--normal-text": "var(--text)",
				"--normal-border": "var(--line-strong)",
				"--border-radius": "var(--radius)",
			} as React.CSSProperties
		}
		{...props}
	/>
);

export { Toaster };
