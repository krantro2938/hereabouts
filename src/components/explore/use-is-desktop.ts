import { useEffect, useState } from "react";

/** True at md and up. False during SSR and first paint, so markup matches on hydration. */
export function useIsDesktop(query = "(min-width: 768px)") {
	const [match, setMatch] = useState(false);
	useEffect(() => {
		const mq = window.matchMedia(query);
		const update = () => setMatch(mq.matches);
		update();
		mq.addEventListener("change", update);
		return () => mq.removeEventListener("change", update);
	}, [query]);
	return match;
}
