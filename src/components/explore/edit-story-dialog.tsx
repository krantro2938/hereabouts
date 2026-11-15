import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { PencilIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { DECADES, decadeLabel } from "#/lib/decades";
import { myCirclesQuery } from "#/lib/queries";
import { updateStory } from "#/server/fns/stories";

type Visibility = "private" | "circle" | "public";
type EditableStory = {
	id: string;
	title: string;
	body: string;
	decade: number;
	year: number | null;
	visibility: Visibility;
	circleId: string | null;
};

export const VISIBILITY_LABEL: Record<Visibility, string> = {
	private: "Just me",
	circle: "Family circle",
	public: "Everyone on the map",
};

export function EditStoryDialog({ story }: { story: EditableStory }) {
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState(story.title);
	const [body, setBody] = useState(story.body);
	const [year, setYear] = useState(story.year ? String(story.year) : "");
	const [decade, setDecade] = useState(
		String(Math.floor(story.decade / 10) * 10),
	);
	const [visibility, setVisibility] = useState<Visibility>(story.visibility);
	const [circleId, setCircleId] = useState<string>(story.circleId ?? "");
	const [saving, setSaving] = useState(false);
	const qc = useQueryClient();
	const router = useRouter();
	const { data: circles = [] } = useQuery({ ...myCirclesQuery, enabled: open });

	const save = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		try {
			const y = year.trim() ? Number(year) : null;
			await updateStory({
				data: {
					id: story.id,
					title,
					body,
					year: y,
					decade: y ? Math.floor(y / 10) * 10 : Number(decade),
					visibility,
					circleId: visibility === "circle" ? circleId || null : null,
				},
			});
			await qc.invalidateQueries();
			await router.invalidate();
			toast.success("Changes saved.");
			setOpen(false);
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: "Couldn’t save. Try again in a moment.",
			);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="secondary" size="sm">
					<PencilIcon />
					Edit
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[90dvh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Edit this memory</DialogTitle>
					<DialogDescription>
						The original recording and transcript stay exactly as they were.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={save} className="grid gap-4">
					<div className="grid gap-1.5">
						<Label htmlFor="e-title">Title</Label>
						<Input
							id="e-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							required
							maxLength={120}
						/>
					</div>
					<div className="grid gap-1.5">
						<Label htmlFor="e-body">The story</Label>
						<Textarea
							id="e-body"
							value={body}
							onChange={(e) => setBody(e.target.value)}
							rows={8}
							required
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="grid gap-1.5">
							<Label htmlFor="e-year">Year, if you know it</Label>
							<Input
								id="e-year"
								inputMode="numeric"
								value={year}
								onChange={(e) => {
									setYear(e.target.value);
									const n = Number(e.target.value);
									if (n >= 1880 && n <= 2100)
										setDecade(String(Math.floor(n / 10) * 10));
								}}
								placeholder="1974"
							/>
						</div>
						<div className="grid gap-1.5">
							<Label htmlFor="e-decade">Decade</Label>
							<Select
								value={decade}
								onValueChange={setDecade}
								disabled={!!year.trim()}
							>
								<SelectTrigger id="e-decade" className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{DECADES.map((d) => (
										<SelectItem key={d} value={String(d)}>
											{decadeLabel(d)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="grid gap-1.5">
						<Label htmlFor="e-vis">Who can hear this?</Label>
						<Select
							value={visibility}
							onValueChange={(v) => setVisibility(v as Visibility)}
						>
							<SelectTrigger id="e-vis" className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{(Object.keys(VISIBILITY_LABEL) as Visibility[]).map((v) => (
									<SelectItem key={v} value={v}>
										{VISIBILITY_LABEL[v]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					{visibility === "circle" && (
						<div className="grid gap-1.5">
							<Label htmlFor="e-circle">Which circle?</Label>
							{circles.length === 0 ? (
								<p className="text-sm text-text-soft">
									You aren’t in a family circle yet. Create one from the Family
									page.
								</p>
							) : (
								<Select value={circleId} onValueChange={setCircleId}>
									<SelectTrigger id="e-circle" className="w-full">
										<SelectValue placeholder="Choose a circle" />
									</SelectTrigger>
									<SelectContent>
										{circles.map((c) => (
											<SelectItem key={c.id} value={c.id}>
												{c.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</div>
					)}
					<DialogFooter>
						<Button type="submit" disabled={saving}>
							{saving ? "Saving" : "Save changes"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
