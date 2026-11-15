import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	ArchiveIcon,
	ChevronUpIcon,
	EllipsisIcon,
	LogOutIcon,
	MapIcon,
	MenuIcon,
	MicIcon,
	UsersRoundIcon,
} from "lucide-react";
import * as React from "react";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import {
	Sheet,
	SheetContent,
	SheetTitle,
	SheetTrigger,
} from "#/components/ui/sheet";
import { Wordmark } from "#/components/wordmark";
import { meQuery, myCirclesQuery, myStorytellersQuery } from "#/lib/queries";
import { cn } from "#/lib/utils";
import { signOut } from "#/server/fns/auth";

export function initials(name: string) {
	const parts = name.trim().split(/\s+/);
	const first = parts[0]?.[0] ?? "";
	const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
	return (first + last).toUpperCase();
}

/** Square gold avatar with initials (the signed-in person). */
export function Avatar({
	name,
	className,
}: {
	name: string;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-gold text-[0.75rem] font-semibold text-gold-ink",
				className,
			)}
			aria-hidden
		>
			{initials(name)}
		</span>
	);
}

/** Round initials chip for storytellers (people whose voices are on the map). */
export function TellerChip({
	name,
	className,
}: {
	name: string;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-semibold text-text-soft ring-1 ring-line-strong ring-inset",
				className,
			)}
			aria-hidden
		>
			{initials(name)}
		</span>
	);
}

function NavItem({
	to,
	icon: Icon,
	label,
	count,
	onNavigate,
}: {
	to: "/map" | "/record" | "/archive" | "/family";
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	count?: React.ReactNode;
	onNavigate?: () => void;
}) {
	return (
		<Link
			to={to}
			onClick={onNavigate}
			className="group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-text-soft transition-colors outline-none hover:bg-raised hover:text-text focus-visible:ring-2 focus-visible:ring-gold"
			activeProps={{
				className:
					"bg-gold-tint! text-gold! ring-1 ring-gold/20 ring-inset [&_svg]:text-gold",
			}}
		>
			<Icon className="size-[1.125rem] text-text-faint transition-colors group-hover:text-text-soft" />
			<span className="flex-1 truncate">{label}</span>
			{count}
		</Link>
	);
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
	const { data: me } = useQuery(meQuery);
	const { data: tellers = [] } = useQuery({
		...myStorytellersQuery,
		enabled: !!me,
	});
	const { data: circles = [] } = useQuery({
		...myCirclesQuery,
		enabled: !!me,
	});
	const [tellersOpen, setTellersOpen] = React.useState(true);
	const qc = useQueryClient();
	const navigate = useNavigate();
	const storyTotal = tellers.reduce((a, t) => a + t.storyCount, 0);
	const shownTellers = tellers.slice(0, 6);

	return (
		<div className="flex h-full flex-col">
			<div className="flex h-16 shrink-0 items-center px-4">
				<Link
					to="/"
					onClick={onNavigate}
					className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-gold"
					aria-label="Hereabouts home"
				>
					<Wordmark />
				</Link>
			</div>

			<nav aria-label="Main" className="space-y-0.5 px-3 pt-2">
				<NavItem to="/map" icon={MapIcon} label="Map" onNavigate={onNavigate} />
				<NavItem
					to="/record"
					icon={MicIcon}
					label="Record a memory"
					onNavigate={onNavigate}
				/>
				<NavItem
					to="/archive"
					icon={ArchiveIcon}
					label="Your archive"
					onNavigate={onNavigate}
					count={
						me && storyTotal > 0 ? (
							<span className="numerals text-xs text-text-faint">
								{storyTotal}
							</span>
						) : null
					}
				/>
				<NavItem
					to="/family"
					icon={UsersRoundIcon}
					label="Family"
					onNavigate={onNavigate}
					count={
						me && circles.length > 0 ? (
							<span className="numerals text-xs text-text-faint">
								{circles.length}
							</span>
						) : null
					}
				/>
			</nav>

			<div className="mx-4 my-4 h-px bg-line" />

			<div className="min-h-0 flex-1 overflow-y-auto px-3">
				{me ? (
					<section aria-labelledby="sidebar-tellers">
						<button
							type="button"
							onClick={() => setTellersOpen((o) => !o)}
							aria-expanded={tellersOpen}
							className="flex h-8 w-full items-center justify-between rounded-md px-3 text-[0.8125rem] text-text-faint outline-none hover:text-text-soft focus-visible:ring-2 focus-visible:ring-gold"
						>
							<span id="sidebar-tellers">Storytellers</span>
							<ChevronUpIcon
								className={cn(
									"size-4 transition-transform",
									!tellersOpen && "rotate-180",
								)}
							/>
						</button>
						{tellersOpen && (
							<ul className="mt-1 space-y-0.5">
								{shownTellers.map((t) => (
									<li key={t.id}>
										<Link
											to="/people/$tellerId"
											params={{ tellerId: t.id }}
											onClick={onNavigate}
											className="flex h-10 items-center gap-3 rounded-lg px-2 text-sm text-text-soft outline-none hover:bg-raised hover:text-text focus-visible:ring-2 focus-visible:ring-gold"
											activeProps={{ className: "bg-raised text-text" }}
										>
											<TellerChip name={t.name} />
											<span className="flex-1 truncate">{t.name}</span>
											<span className="numerals text-xs text-text-faint">
												{t.storyCount}
											</span>
										</Link>
									</li>
								))}
								{tellers.length === 0 && (
									<li className="px-3 py-2 text-[0.8125rem] leading-relaxed text-text-faint">
										The people you record will show up here.
									</li>
								)}
								{tellers.length > shownTellers.length && (
									<li>
										<Link
											to="/archive"
											onClick={onNavigate}
											className="block px-3 py-2 text-[0.8125rem] text-text-faint hover:text-text-soft"
										>
											+ {tellers.length - shownTellers.length} more
										</Link>
									</li>
								)}
							</ul>
						)}
					</section>
				) : (
					<div className="rounded-xl border border-line bg-raised/50 p-4">
						<p className="text-sm font-medium text-text">
							Keep your family’s voices
						</p>
						<p className="mt-1 text-[0.8125rem] leading-relaxed text-text-soft">
							Sign in to record someone, save their stories and share them with
							family.
						</p>
						<Button asChild variant="gold" size="sm" className="mt-3 w-full">
							<Link to="/signin" onClick={onNavigate}>
								Sign in
							</Link>
						</Button>
					</div>
				)}
			</div>

			{me && (
				<div className="shrink-0 border-t border-line p-3">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								className="flex w-full items-center gap-3 rounded-lg p-2 text-left outline-none hover:bg-raised focus-visible:ring-2 focus-visible:ring-gold"
							>
								<Avatar name={me.name} />
								<span className="min-w-0 flex-1">
									<span className="block truncate text-sm font-medium text-text">
										{me.name}
									</span>
									<span className="block truncate text-xs text-text-faint">
										{me.email}
									</span>
								</span>
								<EllipsisIcon className="size-4 text-text-faint" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent side="top" align="start" className="w-60">
							<DropdownMenuLabel className="font-normal">
								<div className="text-sm font-medium">{me.name}</div>
								<div className="truncate text-xs text-text-soft">
									{me.email}
								</div>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onSelect={async () => {
									await signOut();
									qc.clear();
									navigate({ to: "/" });
								}}
							>
								<LogOutIcon />
								Sign out
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			)}
		</div>
	);
}

/**
 * The app frame: a charcoal sidebar on the left (a sheet on phones) and the
 * page on the right. `bleed` gives the page the whole remaining viewport with no
 * padding or scrolling — the map and the recorder use it.
 */
export function AppShell({
	children,
	bleed,
}: {
	children: React.ReactNode;
	bleed?: boolean;
}) {
	const [open, setOpen] = React.useState(false);
	return (
		<div className="flex min-h-dvh bg-canvas">
			<aside className="sticky top-0 hidden h-dvh w-[17rem] shrink-0 border-r border-line bg-panel lg:block">
				<SidebarBody />
			</aside>
			<div className="flex min-w-0 flex-1 flex-col">
				<header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-panel/95 px-3 backdrop-blur lg:hidden">
					<Sheet open={open} onOpenChange={setOpen}>
						<SheetTrigger asChild>
							<Button variant="ghost" size="icon" aria-label="Open menu">
								<MenuIcon className="size-5" />
							</Button>
						</SheetTrigger>
						<SheetContent
							side="left"
							className="w-[17rem] gap-0 border-r border-line bg-panel p-0"
						>
							<SheetTitle className="sr-only">Menu</SheetTitle>
							<SidebarBody onNavigate={() => setOpen(false)} />
						</SheetContent>
					</Sheet>
					<Link to="/" aria-label="Hereabouts home" className="rounded-lg">
						<Wordmark />
					</Link>
					<Button asChild variant="gold" size="sm" className="ml-auto">
						<Link to="/record">
							<MicIcon />
							Record
						</Link>
					</Button>
				</header>
				<main
					className={cn(
						"min-w-0 flex-1",
						bleed &&
							"relative h-[calc(100dvh-3.5rem)] overflow-hidden lg:h-dvh",
					)}
				>
					{children}
				</main>
			</div>
		</div>
	);
}

/** Standard page: the app shell around a readable column. */
export function Page({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<AppShell>
			<div
				className={cn(
					"mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 sm:py-10",
					className,
				)}
			>
				{children}
			</div>
		</AppShell>
	);
}

/** @deprecated The sidebar replaced the top bar; kept so older screens still render. */
export function TopBar(_props: { overlay?: boolean }) {
	return null;
}
