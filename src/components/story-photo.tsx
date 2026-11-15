import { photoUrl } from "#/lib/photo";
import { cn } from "#/lib/utils";

/**
 * A story's photo of the place, with its credit line when we didn't take it.
 * Renders nothing when there's no photo. The parent sets the size/aspect.
 */
export function StoryPhoto({
	file,
	credit,
	sourceUrl,
	alt,
	className,
	showCredit = true,
}: {
	file: string | null | undefined;
	credit?: string | null;
	sourceUrl?: string | null;
	alt: string;
	className?: string;
	showCredit?: boolean;
}) {
	if (!file) return null;
	return (
		<figure
			className={cn("relative overflow-hidden rounded-xl bg-raised", className)}
		>
			<img
				src={photoUrl(file)}
				alt={alt}
				loading="lazy"
				decoding="async"
				className="size-full object-cover"
			/>
			{showCredit && credit && (
				<figcaption className="absolute right-2 bottom-2 max-w-[calc(100%-1rem)] truncate rounded-md bg-black/70 px-2 py-0.5 text-xs text-white/90 backdrop-blur-sm">
					{sourceUrl ? (
						<a
							href={sourceUrl}
							target="_blank"
							rel="noreferrer"
							className="hover:underline focus-visible:underline"
						>
							Photo: {credit}
						</a>
					) : (
						<>Photo: {credit}</>
					)}
				</figcaption>
			)}
		</figure>
	);
}
