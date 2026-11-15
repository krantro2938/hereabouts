import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeftIcon, ArrowRightIcon, LoaderIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { errorMessage, FormError } from "#/components/home/auth";
import { StoryMap } from "#/components/story-map";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Wordmark } from "#/components/wordmark";
import { mapStoriesQuery } from "#/lib/queries";
import {
	authOptions,
	requestCode,
	signInDemo,
	verifyCode,
} from "#/server/fns/auth";

function GoogleG() {
	return (
		<svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
			<path
				fill="#4285F4"
				d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z"
			/>
			<path
				fill="#34A853"
				d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.88-3a7.2 7.2 0 0 1-10.7-3.78H1.34v3.1A12 12 0 0 0 12 24Z"
			/>
			<path
				fill="#FBBC05"
				d="M5.35 14.31a7.2 7.2 0 0 1 0-4.62v-3.1H1.34a12 12 0 0 0 0 10.82l4.01-3.1Z"
			/>
			<path
				fill="#EA4335"
				d="M12 4.75c1.76 0 3.34.6 4.58 1.8l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.34 6.59l4.01 3.1A7.15 7.15 0 0 1 12 4.75Z"
			/>
		</svg>
	);
}

function CodeBoxes({
	onComplete,
	disabled,
	resetKey,
}: {
	onComplete: (code: string) => void;
	disabled: boolean;
	resetKey: number;
}) {
	const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
	const refs = useRef<(HTMLInputElement | null)[]>([]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset whenever the parent says so
	useEffect(() => {
		setDigits(Array(6).fill(""));
		refs.current[0]?.focus();
	}, [resetKey]);

	function commit(next: string[]) {
		setDigits(next);
		if (next.every(Boolean)) onComplete(next.join(""));
	}

	function fill(from: number, text: string) {
		const chars = text
			.replace(/\D/g, "")
			.slice(0, 6 - from)
			.split("");
		if (!chars.length) return;
		const next = [...digits];
		chars.forEach((c, k) => {
			next[from + k] = c;
		});
		commit(next);
		refs.current[Math.min(from + chars.length, 5)]?.focus();
	}

	return (
		<fieldset
			className="flex gap-2 border-0 p-0 sm:gap-2.5"
			aria-label="6-digit code"
		>
			{digits.map((d, i) => (
				<input
					// biome-ignore lint/suspicious/noArrayIndexKey: fixed six boxes
					key={i}
					ref={(el) => {
						refs.current[i] = el;
					}}
					value={d}
					disabled={disabled}
					inputMode="numeric"
					autoComplete={i === 0 ? "one-time-code" : "off"}
					aria-label={`Digit ${i + 1}`}
					maxLength={6}
					onChange={(e) => {
						const v = e.target.value.replace(/\D/g, "");
						if (v.length > 1) return fill(i, v);
						const next = [...digits];
						next[i] = v;
						commit(next);
						if (v && i < 5) refs.current[i + 1]?.focus();
					}}
					onPaste={(e) => {
						e.preventDefault();
						fill(i, e.clipboardData.getData("text"));
					}}
					onKeyDown={(e) => {
						if (e.key === "Backspace" && !digits[i] && i > 0) {
							const next = [...digits];
							next[i - 1] = "";
							setDigits(next);
							refs.current[i - 1]?.focus();
						}
						if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
						if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
					}}
					onFocus={(e) => e.currentTarget.select()}
					className="h-14 min-w-0 flex-1 rounded-lg bg-raised text-center text-2xl font-semibold text-text tabular-nums ring-1 ring-line-strong outline-none ring-inset focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50"
				/>
			))}
		</fieldset>
	);
}

function Backdrop() {
	const { data: pins = [] } = useQuery(mapStoriesQuery("everything"));
	return (
		<div
			className="relative hidden flex-1 overflow-hidden bg-sunk lg:block"
			aria-hidden
		>
			<StoryMap
				pins={pins}
				interactive={false}
				fitPins
				className="pointer-events-none absolute inset-0 size-full"
			/>
			<div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-panel to-transparent" />
			<div className="absolute right-8 bottom-8 left-8 max-w-md rounded-2xl bg-panel/90 p-5 ring-1 ring-line-strong backdrop-blur">
				<p className="prose-story text-[1.0625rem] leading-relaxed text-text">
					“You could hear the market from our front step. Every Saturday my
					mother sent me out with a string bag and four guilders.”
				</p>
				<p className="mt-3 text-sm text-text-faint">
					Sample story, told in Utrecht
				</p>
			</div>
		</div>
	);
}

export function AuthScreen({
	mode,
	redirect,
	error,
	message,
}: {
	mode: "signin" | "signup";
	redirect?: string;
	error?: string;
	message?: string;
}) {
	const qc = useQueryClient();
	const router = useRouter();
	const { data: options } = useQuery({
		queryKey: ["auth-options"],
		queryFn: () => authOptions(),
		staleTime: 5 * 60_000,
	});
	const [step, setStep] = useState<"email" | "code">("email");
	const [email, setEmail] = useState("");
	const [name, setName] = useState("");
	const [busy, setBusy] = useState<"send" | "verify" | "demo" | null>(null);
	const [err, setErr] = useState<string | null>(
		error === "google"
			? (message ??
					"Google sign-in didn't work. Try again or use an email code.")
			: null,
	);
	const [wait, setWait] = useState(0);
	const [resetKey, setResetKey] = useState(0);
	const signup = mode === "signup";

	useEffect(() => {
		if (wait <= 0) return;
		const t = setTimeout(() => setWait((w) => w - 1), 1000);
		return () => clearTimeout(t);
	}, [wait]);

	async function enter(me: { id: string; name: string; email: string }) {
		qc.setQueryData(["me"], me);
		await qc.invalidateQueries({ queryKey: ["me"] });
		await router.navigate({ href: redirect ?? "/map" });
	}

	async function send(e?: React.FormEvent) {
		e?.preventDefault();
		setBusy("send");
		setErr(null);
		try {
			const r = await requestCode({ data: { email } });
			setWait(r.resendIn);
			setStep("code");
			setResetKey((k) => k + 1);
		} catch (x) {
			setErr(errorMessage(x));
		}
		setBusy(null);
	}

	async function verify(code: string) {
		setBusy("verify");
		setErr(null);
		try {
			await enter(
				await verifyCode({
					data: { email, code, name: signup && name.trim() ? name : undefined },
				}),
			);
		} catch (x) {
			setErr(errorMessage(x));
			setResetKey((k) => k + 1);
			setBusy(null);
		}
	}

	async function demo() {
		setBusy("demo");
		setErr(null);
		try {
			await enter(await signInDemo());
		} catch (x) {
			setErr(errorMessage(x));
			setBusy(null);
		}
	}

	const googleHref = `/auth/google${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`;
	const other = signup ? "/signin" : "/signup";

	return (
		<div className="flex min-h-dvh bg-panel">
			<div className="flex w-full flex-col px-4 py-8 sm:px-10 lg:w-[520px] lg:shrink-0 lg:border-r lg:border-line">
				<Link
					to="/"
					aria-label="Hereabouts home"
					className="w-fit rounded-lg focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
				>
					<Wordmark />
				</Link>

				<div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
					{step === "email" ? (
						<>
							<h1 className="text-2xl font-semibold tracking-tight text-text">
								{signup ? "Create your account" : "Sign in to Hereabouts"}
							</h1>
							<p className="mt-2 text-[0.9375rem] text-text-soft">
								{signup
									? "Your recordings stay private until you choose to share them."
									: "Reach your archive and your family circles."}
							</p>

							<div className="mt-7 space-y-4">
								{options?.google && (
									<>
										<Button
											asChild
											variant="outline"
											size="lg"
											className="w-full"
										>
											<a href={googleHref}>
												<GoogleG />
												Continue with Google
											</a>
										</Button>
										<div className="flex items-center gap-3 text-sm text-text-faint">
											<span className="h-px flex-1 bg-line" />
											or
											<span className="h-px flex-1 bg-line" />
										</div>
									</>
								)}
								<form onSubmit={send} className="space-y-4" noValidate>
									{signup && (
										<div className="space-y-1.5">
											<Label htmlFor="name" className="text-text-soft">
												Your name
											</Label>
											<Input
												id="name"
												value={name}
												onChange={(e) => setName(e.target.value)}
												autoComplete="name"
											/>
										</div>
									)}
									<div className="space-y-1.5">
										<Label htmlFor="email" className="text-text-soft">
											Email
										</Label>
										<Input
											id="email"
											type="email"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											autoComplete="email"
											placeholder="you@example.com"
											required
										/>
									</div>
									<FormError message={err} />
									<Button
										type="submit"
										variant="gold"
										size="lg"
										className="w-full"
										disabled={busy !== null || !email.includes("@")}
									>
										{busy === "send" ? (
											<LoaderIcon className="animate-spin" />
										) : null}
										Email me a code
									</Button>
								</form>
							</div>

							<div className="mt-6 border-t border-line pt-6">
								<Button
									type="button"
									variant="secondary"
									size="lg"
									className="w-full"
									onClick={demo}
									disabled={busy !== null}
								>
									{busy === "demo" ? (
										<LoaderIcon className="animate-spin" />
									) : null}
									Try the demo account
								</Button>
								<p className="mt-2 text-center text-sm text-text-faint">
									Explore as Daan, with sample family stories.
								</p>
							</div>

							<p className="mt-8 text-sm text-text-soft">
								{signup ? "Already have an account?" : "New here?"}{" "}
								<Link
									to={other}
									search={redirect ? { redirect } : {}}
									className="font-medium text-text underline decoration-gold decoration-2 underline-offset-4"
								>
									{signup ? "Sign in" : "Create an account"}
								</Link>
							</p>
						</>
					) : (
						<>
							<button
								type="button"
								onClick={() => {
									setStep("email");
									setErr(null);
								}}
								className="mb-6 inline-flex w-fit items-center gap-1.5 rounded-md text-sm text-text-soft hover:text-text focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
							>
								<ArrowLeftIcon className="size-4" />
								Use a different email
							</button>
							<h1 className="text-2xl font-semibold tracking-tight text-text">
								Check your email
							</h1>
							<p className="mt-2 text-[0.9375rem] text-text-soft">
								We sent a 6-digit code to{" "}
								<span className="text-text">{email}</span>.
							</p>
							<div className="mt-7 space-y-4">
								<CodeBoxes
									onComplete={verify}
									disabled={busy === "verify"}
									resetKey={resetKey}
								/>
								<FormError message={err} />
								<p
									className="flex h-5 items-center gap-2 text-sm text-text-faint"
									aria-live="polite"
								>
									{busy === "verify" && (
										<>
											<LoaderIcon className="size-4 animate-spin" />
											Checking…
										</>
									)}
								</p>
							</div>
							<div className="mt-4 flex items-center gap-2 text-sm text-text-soft">
								Didn't get it?
								<button
									type="button"
									disabled={wait > 0 || busy !== null}
									onClick={() => send()}
									className="inline-flex items-center gap-1 rounded-md font-medium text-text underline decoration-gold decoration-2 underline-offset-4 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none disabled:text-text-faint disabled:no-underline"
								>
									{wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
									{wait <= 0 && <ArrowRightIcon className="size-3.5" />}
								</button>
							</div>
						</>
					)}
				</div>
			</div>
			<Backdrop />
		</div>
	);
}
