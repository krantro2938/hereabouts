import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { Wordmark } from "#/components/wordmark";
import { meQuery } from "#/lib/queries";
import { cn } from "#/lib/utils";

const LINKS = [
	{ href: "#how", label: "How it works" },
	{ href: "#privacy", label: "Privacy" },
] as const;

/** Slim landing nav: transparent at the top, a blurred panel once the page scrolls. */
export function LandingNav() {
	const { data: me } = useQuery(meQuery);
	const [scrolled, setScrolled] = useState(false);
	useEffect(() => {
		const on = () => setScrolled(window.scrollY > 12);
		on();
		window.addEventListener("scroll", on, { passive: true });
		return () => window.removeEventListener("scroll", on);
	}, []);

	return (
		<header
			className={cn(
				"sticky top-0 z-40 border-b transition-colors duration-200",
				scrolled
					? "border-line bg-panel/80 backdrop-blur-md"
					: "border-transparent bg-transparent",
			)}
		>
			<nav
				aria-label="Main"
				className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:px-6"
			>
				<Link to="/" aria-label="Hereabouts home" className="mr-4 rounded-lg">
					<Wordmark />
				</Link>
				<div className="hidden items-center gap-1 md:flex">
					<Button asChild variant="ghost" size="sm">
						<Link to="/map">Map</Link>
					</Button>
					{LINKS.map((l) => (
						<Button key={l.href} asChild variant="ghost" size="sm">
							<a href={l.href}>{l.label}</a>
						</Button>
					))}
				</div>
				<div className="ml-auto flex items-center gap-2">
					{me ? (
						<Button asChild variant="ghost" size="sm">
							<Link to="/map">Open the map</Link>
						</Button>
					) : (
						<Button asChild variant="ghost" size="sm">
							<Link to="/signin">Sign in</Link>
						</Button>
					)}
					<Button asChild variant="gold" size="sm">
						<Link to="/record">
							<span className="sm:hidden">Record</span>
							<span className="hidden sm:inline">Record a memory</span>
						</Link>
					</Button>
				</div>
			</nav>
		</header>
	);
}
