import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { meQuery } from "#/lib/queries";

/** Only same-site paths are allowed as a post-sign-in destination. */
export function safeRedirect(value: unknown): string | undefined {
	return typeof value === "string" &&
		value.startsWith("/") &&
		!value.startsWith("//")
		? value
		: undefined;
}

export function validateAuthSearch(search: Record<string, unknown>): {
	redirect?: string;
	error?: string;
	message?: string;
} {
	const r = safeRedirect(search.redirect);
	return {
		...(r ? { redirect: r } : {}),
		...(typeof search.error === "string" ? { error: search.error } : {}),
		...(typeof search.message === "string"
			? { message: search.message.slice(0, 200) }
			: {}),
	};
}

/** beforeLoad guard: send signed-out visitors to /signin and bring them back afterwards. */
export async function requireSignedIn(queryClient: QueryClient, back: string) {
	const me = await queryClient.ensureQueryData(meQuery);
	if (!me) throw redirect({ to: "/signin", search: { redirect: back } });
	return me;
}

export function FormError({ message }: { message: string | null }) {
	if (!message) return null;
	return (
		<p
			role="alert"
			className="rounded-lg bg-on-air/10 px-3 py-2 text-sm text-on-air ring-1 ring-on-air/25"
		>
			{message}
		</p>
	);
}

export function errorMessage(err: unknown) {
	return err instanceof Error && err.message
		? err.message
		: "Something went wrong. Please try again.";
}
