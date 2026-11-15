/**
 * Public URL for a stored photo. Like audioUrl(), the extension is folded into the
 * name ("abc.jpg" → "/api/photos/abc_jpg") so the dev server routes it to the API.
 */
export function photoUrl(file: string): string {
	return `/api/photos/${file.replace(/\.(\w+)$/, "_$1")}`;
}
