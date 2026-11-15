import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRightIcon, CheckIcon, MapPinIcon, MinusIcon } from "lucide-react";
import { useMemo } from "react";
import { AudioPlayer } from "#/components/audio-player";
import { DecadeTag } from "#/components/decade";
import { storyQuery } from "#/components/explore/queries";
import { StoryCard } from "#/components/story-card";
import { StoryPhoto } from "#/components/story-photo";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { audioUrl } from "#/lib/audio";
import { DECADES, decadeColor, formatDuration } from "#/lib/decades";
import { mapStoriesQuery } from "#/lib/queries";
import { cn } from "#/lib/utils";

function Section({
	id,
	title,
	lead,
	children,
	className,
}: {
	id?: string;
	title: string;
	lead?: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<section
			id={id}
			className={cn(
				"scroll-mt-16 border-t border-line py-16 sm:py-24",
				className,
			)}
		>
			<div className="mx-auto max-w-6xl px-4 sm:px-6">
				<div className="mb-8 max-w-2xl sm:mb-12">
					<h2 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] text-text sm:text-[2rem]">
						{title}
					</h2>
					{lead && (
						<p className="mt-3 text-[0.9375rem] text-text-soft sm:text-base">
							{lead}
						</p>
					)}
				</div>
				{children}
			</div>
		</section>
	);
}

/* ---------- Listen ---------- */

export function ListenSection() {
	const { data: pins = [] } = useQuery(mapStoriesQuery("public"));
	const featuredId = "sample-ria-bakery";
	const featured = useQuery({
		...storyQuery(featuredId),
		enabled: pins.length > 0,
	});
	const s = featured.data;

	const others = useMemo(() => {
		const pool = pins.filter((p) => p.id !== featuredId);
		const withPhoto = pool.filter((p) => p.photoFile);
		const rest = pool.filter((p) => !p.photoFile);
		const seen = new Set<string>();
		const out = [];
		for (const p of [...withPhoto, ...rest]) {
			if (seen.has(p.storytellerName) && out.length < 3 && pool.length > 8)
				continue;
			seen.add(p.storytellerName);
			out.push(p);
			if (out.length === 2) break;
		}
		return out;
	}, [pins]);

	const paragraphs = s?.story.body.split(/\n\s*\n/).slice(0, 2) ?? [];

	return (
		<Section
			title="Listen to the street"
			lead="Fifteen sample memories from Utrecht, told by fictional people about real places. Press play, or open the map to hear more."
		>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
				<div className="panel flex min-w-0 flex-col p-5 sm:p-7">
					{!s ? (
						<div className="min-h-[22rem]" aria-busy="true" />
					) : (
						<>
							<StoryPhoto
								file={s.story.photoFile}
								credit={s.story.photoCredit}
								sourceUrl={s.story.photoSourceUrl}
								alt={s.story.placeLabel}
								className="-mx-2 -mt-2 mb-6 aspect-[16/9] sm:-mx-4 sm:-mt-4"
							/>
							<div className="flex flex-wrap items-center gap-2">
								<DecadeTag decade={s.story.decade} year={s.story.year} />
								<Badge>Sample</Badge>
							</div>
							<h3 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-text sm:text-xl">
								{s.story.title}
							</h3>
							<p className="mt-1.5 flex items-center gap-1.5 text-[0.8125rem] text-text-soft">
								<MapPinIcon className="size-3.5 text-text-faint" aria-hidden />
								{s.story.placeLabel}
							</p>
							<div className="mt-5 flex gap-8">
								<div>
									<div className="text-xs text-text-faint">Told by</div>
									<div className="text-sm font-semibold text-text">
										{s.storyteller?.name}
									</div>
								</div>
								<div>
									<div className="text-xs text-text-faint">Length</div>
									<div className="numerals text-sm text-text">
										{formatDuration(s.story.durationMs)}
									</div>
								</div>
							</div>
							{s.story.audioFile && (
								<div className="mt-6">
									<AudioPlayer
										src={audioUrl(s.story.audioFile)}
										durationMs={s.story.durationMs}
									/>
								</div>
							)}
							<div className="prose-story mt-7 border-t border-line pt-6 text-[1.0625rem]">
								{paragraphs.slice(0, 1).map((p) => (
									<p key={p.slice(0, 24)}>{p}</p>
								))}
							</div>
							<Link
								to="/s/$storyId"
								params={{ storyId: s.story.id }}
								className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-medium text-text-soft outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-gold"
							>
								Read the whole story
								<ArrowRightIcon className="size-4" aria-hidden />
							</Link>
						</>
					)}
				</div>
				<div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
					{others.map((p) => (
						<StoryCard
							key={p.id}
							story={{ ...p, isSample: true }}
							className="h-full min-w-0"
						/>
					))}
				</div>
			</div>
			<div className="mt-8">
				<Button asChild variant="outline">
					<Link to="/map">Explore all stories on the map</Link>
				</Button>
			</div>
		</Section>
	);
}

/* ---------- How it works ---------- */

function Meter() {
	const bars = [
		22, 38, 30, 55, 72, 48, 64, 86, 58, 40, 70, 92, 66, 44, 52, 34, 60, 78, 50,
		36, 28, 42, 24,
	];
	return (
		<div>
			<div className="flex items-center justify-between text-xs">
				<span className="flex items-center gap-1.5 text-text-soft">
					<span className="size-2 rounded-full bg-on-air" aria-hidden />
					Recording
				</span>
				<span className="numerals text-text-soft">02:14</span>
			</div>
			<div className="mt-3 flex h-16 items-end gap-[3px]" aria-hidden>
				{bars.map((h, i) => (
					<span
						// biome-ignore lint/suspicious/noArrayIndexKey: static decoration
						key={i}
						className="w-full rounded-full bg-text-soft"
						style={{ height: `${h}%`, opacity: i > 18 ? 0.35 : 1 }}
					/>
				))}
			</div>
		</div>
	);
}

function QuestionCard() {
	return (
		<div className="rounded-xl bg-raised p-4 ring-1 ring-line">
			<div className="text-xs text-text-faint">Suggested next question</div>
			<p className="mt-1.5 text-[0.9375rem] font-medium text-text">
				What did the street smell like on a Saturday morning?
			</p>
			<div className="mt-3 flex gap-2">
				<span className="rounded-full bg-raised-2 px-3 py-1 text-xs font-medium text-text">
					Ask this
				</span>
				<span className="rounded-full px-3 py-1 text-xs text-text-soft ring-1 ring-line-strong ring-inset">
					Another one
				</span>
			</div>
		</div>
	);
}

function TranscriptBit() {
	return (
		<div className="rounded-xl bg-sunk p-4 ring-1 ring-line">
			<div className="flex items-center justify-between text-xs text-text-faint">
				<span>Transcript</span>
				<span className="numerals">0:42</span>
			</div>
			<p className="prose-story mt-2 text-base leading-relaxed">
				Every Saturday my mother sent me to the bakery with exact money in a
				handkerchief.
			</p>
		</div>
	);
}

function PinBit() {
	const counts = [1, 2, 1, 1, 2, 4, 2, 1, 1, 1];
	const tuned = 5;
	return (
		<div>
			<div className="flex h-14 items-end gap-1.5" aria-hidden>
				{DECADES.slice(0, counts.length).map((d, i) => (
					<span
						key={d}
						className={cn(
							"w-full rounded-sm",
							i === tuned ? "bg-gold" : "hatch",
						)}
						style={{ height: `${25 + counts[i] * 18}%` }}
					/>
				))}
			</div>
			<div className="mt-3 flex items-center justify-between text-xs">
				<span className="flex items-center gap-1.5 text-text-soft">
					<MapPinIcon className="size-3.5 text-text-faint" aria-hidden />
					Twijnstraat, Utrecht
				</span>
				<span className="flex items-center gap-1.5 text-text">
					<span
						className="size-2 rounded-full"
						style={{ background: decadeColor(1950) }}
						aria-hidden
					/>
					<span className="numerals">1950s</span>
				</span>
			</div>
		</div>
	);
}

const STEPS = [
	{
		title: "Sit down and record",
		body: "A grandmother, a neighbour, the man who ran the bakery. A quiet half hour and a phone are all you need.",
		art: <Meter />,
	},
	{
		title: "It suggests the next question",
		body: "When the conversation pauses, Hereabouts offers a question you can ask, or you can ignore it.",
		art: <QuestionCard />,
	},
	{
		title: "It writes it down in their words",
		body: "The recording becomes a transcript, then a short story that keeps the way they speak.",
		art: <TranscriptBit />,
	},
	{
		title: "Pin it to the place and the decade",
		body: "Put the memory at the corner where it happened. You confirm the place and the years before it is saved.",
		art: <PinBit />,
	},
];

export function HowSection() {
	return (
		<Section id="how" title="How it works">
			<ol className="grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
				{STEPS.map((s, i) => (
					<li
						key={s.title}
						className="panel row-span-2 grid grid-rows-subgrid gap-0 p-5"
					>
						{/* subgrid: the art row is as tall as the tallest art in its row */}
						<div className="flex min-h-32 flex-col justify-center">{s.art}</div>
						<div className="mt-6 border-t border-line pt-5">
							<div className="numerals text-xs text-text-faint">
								Step {i + 1}
							</div>
							<h3 className="mt-1 text-[1.0625rem] font-semibold tracking-[-0.01em] text-text">
								{s.title}
							</h3>
							<p className="mt-2 text-sm text-text-soft">{s.body}</p>
						</div>
					</li>
				))}
			</ol>
		</Section>
	);
}

/* ---------- Private by default ---------- */

const LEVELS = [
	{
		dot: "bg-text-faint",
		name: "Just me",
		body: "Where every recording begins. Only you can hear it.",
		tag: "Default",
	},
	{
		dot: "bg-signal",
		name: "Family circle",
		body: "The people you invite with a link. Good for a family archive.",
	},
	{
		dot: "bg-ok",
		name: "Everyone on the map",
		body: "Anyone who opens the map can hear it, in the place it belongs to.",
	},
];

export function PrivacySection() {
	return (
		<Section id="privacy" title="Private by default">
			<div className="grid items-start gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
				<div className="max-w-md space-y-4 text-[0.9375rem] text-text-soft sm:text-base">
					<p>
						Nothing leaves your account until you say so. A grandmother’s story
						can stay a family keepsake forever.
					</p>
					<p>
						When you are ready, share it with your family circle, or with the
						neighbourhood. You choose for each memory, and you can change your
						mind later.
					</p>
				</div>
				<ul className="panel divide-y divide-line">
					{LEVELS.map((l) => (
						<li key={l.name} className="flex items-start gap-4 p-5">
							<span
								className={cn("mt-1.5 size-2 shrink-0 rounded-full", l.dot)}
								aria-hidden
							/>
							<div className="min-w-0">
								<div className="flex items-center gap-2">
									<span className="font-semibold text-text">{l.name}</span>
									{l.tag && <Badge>{l.tag}</Badge>}
								</div>
								<p className="mt-1 text-sm text-text-soft">{l.body}</p>
							</div>
						</li>
					))}
				</ul>
			</div>
		</Section>
	);
}

/* ---------- AI ---------- */

const AI_DOES = [
	"Suggests the next question to ask",
	"Writes down what was said",
	"Tidies the transcript into a short story, in their words",
	"Proposes a place and a decade",
];
const AI_NEVER = [
	"Replace the original voice. The recording and the word-for-word transcript are always kept.",
	"Save anything for you. You confirm every suggestion first.",
	"Get in the way. If it is unavailable, you can do every step by hand.",
];

export function AiSection() {
	return (
		<Section
			title="What the AI does and doesn’t do"
			lead="It helps with the writing. The memory stays theirs."
		>
			<div className="grid gap-4 md:grid-cols-2">
				<div className="panel p-6">
					<h3 className="text-[1.0625rem] font-semibold text-text">
						It helps with
					</h3>
					<ul className="mt-4 space-y-3">
						{AI_DOES.map((t) => (
							<li key={t} className="flex gap-3 text-sm text-text-soft">
								<CheckIcon
									className="mt-0.5 size-4 shrink-0 text-ok"
									aria-hidden
								/>
								{t}
							</li>
						))}
					</ul>
				</div>
				<div className="panel p-6">
					<h3 className="text-[1.0625rem] font-semibold text-text">
						It will not
					</h3>
					<ul className="mt-4 space-y-3">
						{AI_NEVER.map((t) => (
							<li key={t} className="flex gap-3 text-sm text-text-soft">
								<MinusIcon
									className="mt-0.5 size-4 shrink-0 text-text-faint"
									aria-hidden
								/>
								{t}
							</li>
						))}
					</ul>
				</div>
			</div>
		</Section>
	);
}

/* ---------- Why it matters ---------- */

const WHY = [
	{
		label: "Local history",
		text: "Most of what a street used to be lives in people’s heads. When they are gone, nobody wrote it down.",
	},
	{
		label: "Being listened to",
		text: "Many older people go days without anyone asking about their lives. A few good questions can change that.",
	},
	{
		label: "Between generations",
		text: "A grandchild with a phone becomes the archivist, and learns where their own family comes from.",
	},
];

export function WhySection() {
	return (
		<Section title="Why it matters">
			<div className="grid gap-10 md:grid-cols-3 md:gap-8">
				{WHY.map((w) => (
					<div key={w.label} className="border-t border-line-strong pt-5">
						<div className="text-sm text-text-faint">{w.label}</div>
						<p className="mt-3 text-lg leading-snug font-medium tracking-[-0.01em] text-text">
							{w.text}
						</p>
					</div>
				))}
			</div>
		</Section>
	);
}

/* ---------- Closing CTA + footer ---------- */

export function ClosingCta() {
	return (
		<section className="border-t border-line py-20 sm:py-28">
			<div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 sm:px-6">
				<p className="max-w-xl text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] text-text sm:text-4xl">
					Ask someone this week. The map can wait; they can’t.
				</p>
				<Button asChild variant="gold" size="lg">
					<Link to="/record">Record a memory</Link>
				</Button>
			</div>
		</section>
	);
}
