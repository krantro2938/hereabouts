import { createFileRoute } from "@tanstack/react-router";
import { validateAuthSearch } from "#/components/home/auth";
import { AuthScreen } from "#/components/home/auth-screen";

export const Route = createFileRoute("/signup")({
	validateSearch: validateAuthSearch,
	head: () => ({ meta: [{ title: "Create an account | Hereabouts" }] }),
	component: SignUpPage,
});

function SignUpPage() {
	const { redirect, error, message } = Route.useSearch();
	return (
		<AuthScreen
			mode="signup"
			redirect={redirect}
			error={error}
			message={message}
		/>
	);
}
