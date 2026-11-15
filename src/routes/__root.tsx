import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { Toaster } from "#/components/ui/sonner";
import { TooltipProvider } from "#/components/ui/tooltip";
import appCss from "../styles.css?url";

interface RouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover",
			},
			{
				title: "Hereabouts: every street has someone who remembers it",
			},
			{
				name: "description",
				content:
					"Record the stories of the people who remember your street, pin them to the place and the decade, and keep them for your family — or share them with the neighbourhood.",
			},
			{ name: "theme-color", content: "#111214" },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
		],
	}),
	shellComponent: RootDocument,
	component: () => <Outlet />,
	notFoundComponent: NotFound,
});

function NotFound() {
	return (
		<div className="grid min-h-dvh place-items-center bg-canvas p-4">
			<div className="panel w-full max-w-sm p-6 text-left shadow-float">
				<h1 className="text-lg font-semibold tracking-[-0.02em] text-text">
					Nobody remembers this page
				</h1>
				<p className="mt-2 text-sm text-text-soft">
					The link may be old, or the story was made private.
				</p>
				<Link
					className="mt-5 inline-flex h-10 items-center rounded-lg bg-raised px-4 text-sm font-medium text-text outline-none hover:bg-raised-2 focus-visible:ring-2 focus-visible:ring-gold"
					to="/map"
				>
					Go to the map
				</Link>
			</div>
		</div>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<TooltipProvider delayDuration={250}>
					{children}
					<Toaster position="bottom-center" />
				</TooltipProvider>
				<Scripts />
			</body>
		</html>
	);
}
