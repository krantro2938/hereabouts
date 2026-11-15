import { createFileRoute } from "@tanstack/react-router";
import { validateAuthSearch } from "#/components/home/auth";
import { AuthScreen } from "#/components/home/auth-screen";

export const Route = createFileRoute("/signin")({
	validateSearch: validateAuthSearch,
	head: () => ({ meta: [{ title: "Sign in | Hereabouts" }] }),
	component: SignInPage,
});

function SignInPage() {
	const { redirect, error, message } = Route.useSearch();
	return (
		<AuthScreen
			mode="signin"
			redirect={redirect}
			error={error}
			message={message}
		/>
	);
}
