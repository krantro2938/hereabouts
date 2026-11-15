import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRightIcon, FlagIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Textarea } from "#/components/ui/textarea";
import { decadeColor } from "#/lib/decades";
import { cn } from "#/lib/utils";
import { deleteStory, reportStory } from "#/server/fns/stories";

export type Visibility = "private" | "circle" | "public";

export const VIS_DOT: Record<
	Visibility,
	{ label: string; short: string; dot: string }
> = {
	private: { label: "Just me", short: "Just me", dot: "bg-text-faint" },
	circle: { label: "Family circle", short: "Family", dot: "bg-signal" },
	public: { label: "Everyone on the map", short: "Public", dot: "bg-ok" },
};

/** Visibility as a status dot plus label. */
export function VisibilityDot({
	visibility,
	short,
	className,
}: {
	visibility: Visibility;
	short?: boolean;
	className?: string;
}) {
	const v = VIS_DOT[visibility];
	return (
		<span className={cn("inline-flex items-center gap-1.5", className)}>
			<span aria-hidden className={cn("size-2 rounded-full", v.dot)} />
			{short ? v.short : v.label}
		</span>
	);
}

/** Visibility as a chip: "● Family". */
export function VisibilityChip({ visibility }: { visibility: Visibility }) {
	return (
		<span className="inline-flex items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-2 text-xs font-medium text-text ring-1 ring-line-strong ring-inset">
			<VisibilityDot visibility={visibility} short />
		</span>
	);
}

/** Grey label left, white value right. */
export function DetailsList({
	rows,
}: {
	rows: { label: string; value: React.ReactNode }[];
}) {
	return (
		<dl className="divide-y divide-line">
			{rows.map((r) => (
				<div
					key={r.label}
					className="flex min-h-11 items-baseline justify-between gap-4 py-2.5 text-sm"
				>
					<dt className="shrink-0 text-text-faint">{r.label}</dt>
					<dd className="min-w-0 text-right font-medium text-text">
						{r.value}
					</dd>
				</div>
			))}
		</dl>
	);
}

export function SectionLabel({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<h3 className={cn("text-sm font-medium text-text-soft", className)}>
			{children}
		</h3>
	);
}

export function DecadeDot({
	decade,
	className,
}: {
	decade: number;
	className?: string;
}) {
	return (
		<span
			aria-hidden
			className={cn("size-2.5 shrink-0 rounded-full", className)}
			style={{ background: decadeColor(decade) }}
		/>
	);
}

export function formatRecorded(d: Date | string | number | null | undefined) {
	if (!d) return "";
	const date = new Date(d);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleDateString("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

export function DeleteStory({ id }: { id: string }) {
	const navigate = useNavigate();
	const qc = useQueryClient();
	const [busy, setBusy] = useState(false);
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant="outline" size="sm">
					<Trash2Icon />
					Delete
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete this memory?</AlertDialogTitle>
					<AlertDialogDescription>
						The recording, transcript and story will be removed for good. This
						can’t be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Keep it</AlertDialogCancel>
					<AlertDialogAction
						disabled={busy}
						onClick={async (e) => {
							e.preventDefault();
							setBusy(true);
							try {
								await deleteStory({ data: { id } });
								qc.removeQueries({ queryKey: ["story", id] });
								await qc.invalidateQueries();
								toast.success("Memory deleted.");
								navigate({ to: "/archive" });
							} catch (err) {
								toast.error(
									err instanceof Error
										? err.message
										: "Couldn’t delete. Try again in a moment.",
								);
								setBusy(false);
							}
						}}
					>
						Delete memory
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function ReportStory({ id }: { id: string }) {
	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState("");
	const [busy, setBusy] = useState(false);
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="ghost" size="sm" className="text-text-soft">
					<FlagIcon />
					Report this story
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Report this story</DialogTitle>
					<DialogDescription>
						Tell us what’s wrong. A person will read it.
					</DialogDescription>
				</DialogHeader>
				<form
					className="grid gap-4"
					onSubmit={async (e) => {
						e.preventDefault();
						setBusy(true);
						try {
							await reportStory({ data: { id, reason } });
							toast.success("Thanks, we’ll take a look.");
							setReason("");
							setOpen(false);
						} catch (err) {
							toast.error(
								err instanceof Error
									? err.message
									: "Couldn’t send the report. Try again.",
							);
						} finally {
							setBusy(false);
						}
					}}
				>
					<Textarea
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						rows={4}
						minLength={3}
						maxLength={500}
						required
						aria-label="What’s wrong with this story?"
						placeholder="What’s wrong with this story?"
					/>
					<DialogFooter>
						<Button type="submit" disabled={busy || reason.trim().length < 3}>
							Send report
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export function fmtDistance(m: number) {
	return m < 1000
		? `${Math.max(10, Math.round(m / 10) * 10)} m away`
		: `${(m / 1000).toFixed(1)} km away`;
}

type Conn = {
	id: string;
	title: string;
	decade: number;
	reason: string;
	distanceM: number;
	storytellerName?: string;
};

/** A connected memory as an accordion-style row: decade dot, title, reason chip, chevron. */
export function ConnectedRow<T extends Conn>({
	c,
	onSelect,
}: {
	c: T;
	onSelect?: (c: T) => void;
}) {
	const inner = (
		<>
			<DecadeDot decade={c.decade} />
			<span className="min-w-0 flex-1" title={c.reason}>
				<span className="line-clamp-2 text-sm leading-snug font-medium text-text">
					{c.title}
				</span>
				<span className="block truncate text-xs text-text-faint">
					{c.storytellerName ?? c.reason}
				</span>
			</span>
			<span className="numerals shrink-0 rounded-full bg-raised px-2 py-0.5 text-xs font-medium text-text-soft ring-1 ring-line-strong ring-inset">
				{fmtDistance(c.distanceM)}
			</span>
			<ChevronRightIcon
				className="size-4 shrink-0 text-text-faint"
				aria-hidden
			/>
		</>
	);
	const cls =
		"flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl border border-line bg-sunk px-3.5 py-2.5 text-left transition-colors outline-none hover:border-line-strong hover:bg-raised focus-visible:ring-2 focus-visible:ring-gold";
	if (onSelect)
		return (
			<button type="button" className={cls} onClick={() => onSelect(c)}>
				{inner}
			</button>
		);
	return (
		<Link to="/s/$storyId" params={{ storyId: c.id }} className={cls}>
			{inner}
		</Link>
	);
}
