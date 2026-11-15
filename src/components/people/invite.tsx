import { CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";

/** Invite code chip with a copy-link button. */
export function InviteCode({ code }: { code: string }) {
	const link =
		typeof window === "undefined"
			? `/join/${code}`
			: `${window.location.origin}/join/${code}`;
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(link);
			toast("Invite link copied");
		} catch {
			toast("Couldn’t copy. Select the link and copy it by hand.");
		}
	};
	return (
		<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
			<div>
				<div className="text-xs text-text-faint">Invite code</div>
				<span className="numerals mt-0.5 inline-block rounded-full bg-raised px-3 py-1 text-sm tracking-[0.08em] ring-1 ring-line-strong ring-inset">
					{code}
				</span>
			</div>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="mt-4"
				onClick={copy}
			>
				<CopyIcon />
				Copy invite link
			</Button>
		</div>
	);
}
