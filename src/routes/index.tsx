import { createFileRoute, Link } from "@tanstack/react-router";
import { HeroVignette } from "#/components/home/hero-vignette";
import { LandingNav } from "#/components/home/landing-nav";
import {
	AiSection,
	ClosingCta,
	HowSection,
	ListenSection,
	PrivacySection,
	WhySection,
} from "#/components/home/sections";
import { Button } from "#/components/ui/button";
import { Wordmark } from "#/components/wordmark";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
	return (
		<div className="min-h-dvh bg-canvas text-text">
			<LandingNav />
			<main>
				<section className="mx-auto max-w-6xl px-4 pt-6 pb-12 sm:px-6 sm:pt-10 sm:pb-20">
					<h1 className="max-w-3xl text-[2.5rem] leading-[1.04] font-semibold tracking-[-0.035em] text-text sm:text-6xl">
						Every street has someone who remembers it.
					</h1>
					<p className="mt-5 max-w-xl text-base text-text-soft sm:text-lg">
						Record the people who lived there, then pin their voice to the place
						and the decade it is about.
					</p>
					<div className="mt-7 flex flex-wrap gap-3">
						<Button asChild variant="gold" size="lg">
							<Link to="/record">Record a memory</Link>
						</Button>
						<Button asChild variant="outline" size="lg">
							<Link to="/map">Explore the map</Link>
						</Button>
					</div>
					<div className="mt-10 sm:mt-12">
						<HeroVignette />
					</div>
				</section>
				<ListenSection />
				<HowSection />
				<PrivacySection />
				<AiSection />
				<WhySection />
				<ClosingCta />
			</main>
			<footer className="border-t border-line">
				<div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
					<div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
						<Wordmark />
						<nav
							aria-label="Footer"
							className="flex gap-5 text-sm text-text-soft"
						>
							<Link to="/map" className="hover:text-text">
								Map
							</Link>
							<a
								href="https://github.com/krantro2938/hereabouts"
								className="hover:text-text"
							>
								Source code
							</a>
						</nav>
					</div>
					<div className="space-y-1 text-[0.8125rem] text-text-faint">
						<p>Built for Code for Change 2026.</p>
						<p>
							Sample stories are fictional; places and history are real. Photos:
							Wikimedia Commons / Het Utrechts Archief, credited on each story.
							Map data © OpenStreetMap contributors.
						</p>
					</div>
				</div>
			</footer>
		</div>
	);
}
