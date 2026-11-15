import { and, eq, inArray, or, type SQL } from "drizzle-orm";
import type { PublicUser } from "./auth";
import { db } from "./db";
import { circleMembers, type Story, stories } from "./schema";

export function myCircleIds(userId: string): string[] {
	return db()
		.select({ id: circleMembers.circleId })
		.from(circleMembers)
		.where(eq(circleMembers.userId, userId))
		.all()
		.map((r) => r.id);
}

/** SQL filter for stories the viewer may see. */
export function visibleTo(user: PublicUser | null): SQL {
	const pub = and(
		eq(stories.visibility, "public"),
		eq(stories.hidden, false),
	) as SQL;
	if (!user) return pub;
	const circles = myCircleIds(user.id);
	const parts: SQL[] = [pub, eq(stories.authorId, user.id)];
	if (circles.length)
		parts.push(
			and(
				eq(stories.visibility, "circle"),
				inArray(stories.circleId, circles),
			) as SQL,
		);
	return or(...parts) as SQL;
}

export function canView(user: PublicUser | null, s: Story): boolean {
	if (user && s.authorId === user.id) return true;
	if (s.visibility === "public" && !s.hidden) return true;
	if (user && s.visibility === "circle" && s.circleId)
		return myCircleIds(user.id).includes(s.circleId);
	return false;
}
