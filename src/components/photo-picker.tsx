import { ImagePlusIcon, Loader2Icon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { photoUrl } from "#/lib/photo";
import { cn } from "#/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp";

/**
 * Optional "Add a photo of the place" control for the record flow.
 * value: the uploaded file name (from POST /api/photos) or null.
 */
export function PhotoPicker({
	value,
	onChange,
	className,
}: {
	value: string | null;
	onChange: (file: string | null) => void;
	className?: string;
}) {
	const input = useRef<HTMLInputElement>(null);
	const [busy, setBusy] = useState(false);
	const [over, setOver] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function upload(file: File | undefined) {
		if (!file) return;
		setError(null);
		if (!ACCEPT.split(",").includes(file.type)) {
			setError("Please choose a JPEG, PNG or WebP photo.");
			return;
		}
		if (file.size > 12 * 1024 * 1024) {
			setError("That photo is larger than 12 MB. Try a smaller one.");
			return;
		}
		setBusy(true);
		try {
			const body = new FormData();
			body.append("photo", file);
			const res = await fetch("/api/photos", { method: "POST", body });
			const json = (await res.json().catch(() => ({}))) as {
				file?: string;
				error?: string;
			};
			if (!res.ok || !json.file)
				throw new Error(json.error ?? "The photo didn’t upload. Try again.");
			onChange(json.file);
		} catch (e) {
			setError(e instanceof Error ? e.message : "The photo didn’t upload.");
		} finally {
			setBusy(false);
			if (input.current) input.current.value = "";
		}
	}

	return (
		<div className={className}>
			<input
				ref={input}
				type="file"
				accept={ACCEPT}
				className="sr-only"
				tabIndex={-1}
				aria-label="Photo of the place"
				onChange={(e) => upload(e.target.files?.[0])}
			/>
			{value ? (
				<div className="relative overflow-hidden rounded-xl bg-raised ring-1 ring-line">
					<img
						src={photoUrl(value)}
						alt="Your chosen view of the place"
						className="aspect-[16/9] w-full object-cover"
					/>
					<button
						type="button"
						onClick={() => onChange(null)}
						aria-label="Remove photo"
						className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-black/65 text-white backdrop-blur transition-colors hover:bg-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
					>
						<XIcon className="size-4" />
					</button>
				</div>
			) : (
				<button
					type="button"
					disabled={busy}
					onClick={() => input.current?.click()}
					onDragOver={(e) => {
						e.preventDefault();
						setOver(true);
					}}
					onDragLeave={() => setOver(false)}
					onDrop={(e) => {
						e.preventDefault();
						setOver(false);
						upload(e.dataTransfer.files?.[0]);
					}}
					className={cn(
						"flex w-full items-center gap-3 rounded-xl border border-dashed border-line-strong bg-sunk px-4 py-4 text-left transition-colors hover:border-gold-line hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-wait",
						over && "border-gold-line bg-gold-tint",
					)}
				>
					<span className="grid size-10 shrink-0 place-items-center rounded-full bg-raised text-text-soft ring-1 ring-line">
						{busy ? (
							<Loader2Icon className="size-5 animate-spin" />
						) : (
							<ImagePlusIcon className="size-5" />
						)}
					</span>
					<span className="min-w-0">
						<span className="block text-sm font-medium text-text">
							{busy ? "Uploading…" : "Add a photo of the place (optional)"}
						</span>
						<span className="block text-sm text-text-faint">
							An old photo from the family album works best
						</span>
					</span>
				</button>
			)}
			{error && (
				<p role="alert" className="mt-2 text-sm text-destructive">
					{error}
				</p>
			)}
		</div>
	);
}
