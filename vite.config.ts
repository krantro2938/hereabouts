import { existsSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, type Plugin } from "vite";

// Server code reads process.env; load .env in dev so SSR and server routes see it.
if (existsSync(".env")) process.loadEnvFile(".env");

/**
 * In dev, requests for media (`Sec-Fetch-Dest: audio|video|image`) are treated as static
 * assets and never reach the app's API routes — so <audio src="/api/audio/…"> 404s.
 * Normalise the header for /api/* so the router handles them (production is unaffected).
 */
const apiMediaInDev = (): Plugin => ({
	name: "hereabouts:api-media-in-dev",
	configureServer(server) {
		server.middlewares.use((req, _res, next) => {
			if (req.url?.startsWith("/api/")) req.headers["sec-fetch-dest"] = "empty";
			next();
		});
	},
});

export default defineConfig({
	resolve: { tsconfigPaths: true },
	server: { port: 3000 },
	ssr: {
		// native module: resolve from node_modules at runtime instead of bundling
		external: ["better-sqlite3"],
	},
	plugins: [
		apiMediaInDev(),
		nitro({ traceDeps: ["better-sqlite3*"] }),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
});
