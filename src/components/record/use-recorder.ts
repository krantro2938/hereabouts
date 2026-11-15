import { useCallback, useEffect, useRef, useState } from "react";

export type RecState = "idle" | "recording" | "paused" | "stopped";
export const BAR_COUNT = 24;

function pickMime(): string | undefined {
	if (typeof MediaRecorder === "undefined") return undefined;
	for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]) {
		if (MediaRecorder.isTypeSupported(m)) return m;
	}
	return undefined;
}

type SpeechRec = {
	continuous: boolean;
	interimResults: boolean;
	lang: string;
	onresult:
		| ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
		| null;
	onend: (() => void) | null;
	onerror: (() => void) | null;
	start: () => void;
	stop: () => void;
};

/** MediaRecorder + a live level meter + optional live captions. */
export function useRecorder() {
	const [state, setState] = useState<RecState>("idle");
	const [elapsedMs, setElapsedMs] = useState(0);
	const [levels, setLevels] = useState<number[]>(() =>
		Array(BAR_COUNT).fill(0),
	);
	const [error, setError] = useState<string | null>(null);
	const [liveWords, setLiveWords] = useState("");

	const recorder = useRef<MediaRecorder | null>(null);
	const stream = useRef<MediaStream | null>(null);
	const chunks = useRef<Blob[]>([]);
	const mime = useRef<string | undefined>(undefined);
	const audioCtx = useRef<AudioContext | null>(null);
	const raf = useRef(0);
	const clock = useRef({ base: 0, startedAt: 0, running: false });
	const speech = useRef<SpeechRec | null>(null);
	const wantSpeech = useRef(false);
	const stateRef = useRef<RecState>("idle");
	stateRef.current = state;

	const tick = useCallback(
		(analyser: AnalyserNode, buf: Uint8Array<ArrayBuffer>) => {
			const loop = () => {
				analyser.getByteFrequencyData(buf);
				const next: number[] = [];
				// voice sits in the lower bins; spread them over the bars
				const usable = Math.floor(buf.length * 0.55);
				const per = Math.max(1, Math.floor(usable / BAR_COUNT));
				for (let i = 0; i < BAR_COUNT; i++) {
					let sum = 0;
					for (let j = 0; j < per; j++) sum += buf[i * per + j] ?? 0;
					next.push(Math.min(1, (sum / per / 255) * 1.5));
				}
				setLevels(next);
				const c = clock.current;
				if (c.running) setElapsedMs(c.base + (performance.now() - c.startedAt));
				raf.current = requestAnimationFrame(loop);
			};
			loop();
		},
		[],
	);

	const startSpeech = useCallback(() => {
		const w = window as unknown as {
			SpeechRecognition?: new () => SpeechRec;
			webkitSpeechRecognition?: new () => SpeechRec;
		};
		const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
		if (!Ctor) return;
		try {
			const r = new Ctor();
			r.continuous = true;
			r.interimResults = true;
			r.lang = navigator.language || "en-US";
			r.onresult = (e) => {
				const last = e.results[e.results.length - 1];
				const text = last?.[0]?.transcript?.trim();
				if (text)
					setLiveWords(text.length > 140 ? `…${text.slice(-140)}` : text);
			};
			r.onerror = () => {
				wantSpeech.current = false;
			};
			r.onend = () => {
				if (wantSpeech.current && stateRef.current === "recording") {
					try {
						r.start();
					} catch {}
				}
			};
			wantSpeech.current = true;
			r.start();
			speech.current = r;
		} catch {}
	}, []);
	const stopSpeech = useCallback(() => {
		wantSpeech.current = false;
		try {
			speech.current?.stop();
		} catch {}
		speech.current = null;
	}, []);

	const cleanup = useCallback(() => {
		cancelAnimationFrame(raf.current);
		stopSpeech();
		stream.current?.getTracks().forEach((t) => {
			t.stop();
		});
		stream.current = null;
		audioCtx.current?.close().catch(() => {});
		audioCtx.current = null;
		setLevels(Array(BAR_COUNT).fill(0));
	}, [stopSpeech]);

	useEffect(() => () => cleanup(), [cleanup]);

	const start = useCallback(async () => {
		setError(null);
		setLiveWords("");
		if (
			!navigator.mediaDevices?.getUserMedia ||
			typeof MediaRecorder === "undefined"
		) {
			setError(
				"This browser can’t record audio. You can type the memory instead, or try Chrome, Edge or Safari.",
			);
			return;
		}
		let s: MediaStream;
		try {
			s = await navigator.mediaDevices.getUserMedia({
				audio: { echoCancellation: true, noiseSuppression: true },
			});
		} catch (e) {
			const name = (e as DOMException).name;
			setError(
				name === "NotFoundError"
					? "No microphone was found. Plug one in, or type the memory instead."
					: name === "NotReadableError"
						? "Another app is using the microphone. Close it, then try again."
						: "The microphone is blocked. Allow it in your browser’s address bar, then try again.",
			);
			return;
		}
		stream.current = s;
		mime.current = pickMime();
		chunks.current = [];
		const rec = new MediaRecorder(
			s,
			mime.current ? { mimeType: mime.current } : undefined,
		);
		rec.ondataavailable = (e) => {
			if (e.data.size > 0) chunks.current.push(e.data);
		};
		recorder.current = rec;
		rec.start(1000);

		try {
			const ctx = new AudioContext();
			audioCtx.current = ctx;
			const analyser = ctx.createAnalyser();
			analyser.fftSize = 512;
			analyser.smoothingTimeConstant = 0.75;
			ctx.createMediaStreamSource(s).connect(analyser);
			tick(analyser, new Uint8Array(analyser.frequencyBinCount));
		} catch {}

		clock.current = { base: 0, startedAt: performance.now(), running: true };
		setElapsedMs(0);
		setState("recording");
		startSpeech();
	}, [tick, startSpeech]);

	const pause = useCallback(() => {
		const rec = recorder.current;
		if (!rec || rec.state !== "recording") return;
		rec.pause();
		const c = clock.current;
		c.base += performance.now() - c.startedAt;
		c.running = false;
		setElapsedMs(c.base);
		stopSpeech();
		setState("paused");
	}, [stopSpeech]);

	const resume = useCallback(() => {
		const rec = recorder.current;
		if (!rec || rec.state !== "paused") return;
		rec.resume();
		clock.current.startedAt = performance.now();
		clock.current.running = true;
		setState("recording");
		startSpeech();
	}, [startSpeech]);

	/** The recording so far, as one playable blob (chunks from `start(1000)` concatenate cleanly). */
	const snapshot = useCallback(() => {
		if (!chunks.current.length) return null;
		return new Blob(chunks.current, {
			type: mime.current?.split(";")[0] ?? "audio/webm",
		});
	}, []);

	const stop = useCallback(
		() =>
			new Promise<{ blob: Blob | null; durationMs: number }>((resolve) => {
				const rec = recorder.current;
				const c = clock.current;
				const durationMs = Math.round(
					c.running ? c.base + (performance.now() - c.startedAt) : c.base,
				);
				c.running = false;
				const finish = () => {
					const blob = snapshot();
					cleanup();
					setState("stopped");
					resolve({ blob, durationMs });
				};
				if (!rec || rec.state === "inactive") return finish();
				rec.onstop = finish;
				rec.stop();
			}),
		[cleanup, snapshot],
	);

	const reset = useCallback(() => {
		cleanup();
		chunks.current = [];
		setState("idle");
		setElapsedMs(0);
		setLiveWords("");
	}, [cleanup]);

	return {
		state,
		elapsedMs,
		levels,
		error,
		liveWords,
		start,
		pause,
		resume,
		stop,
		snapshot,
		reset,
	};
}
