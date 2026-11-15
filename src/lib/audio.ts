/**
 * Public URL for a stored recording. The extension is folded into the name
 * ("abc.mp3" → "/api/audio/abc_mp3") because the dev server treats paths ending in
 * media extensions as static files and never routes them to the API.
 */
export function audioUrl(file: string): string {
	return `/api/audio/${file.replace(/\.(\w+)$/, "_$1")}`;
}
