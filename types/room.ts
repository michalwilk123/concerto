export type Role = "admin" | "moderator" | "student" | "participant";

export function isModerator(role: Role): boolean {
	return role === "admin" || role === "moderator";
}

export function parseRoleFromMetadata(metadata?: string): Role | null {
	if (!metadata) return null;

	try {
		const parsed = JSON.parse(metadata);
		const role = parsed.role;

		if (role === "admin" || role === "moderator" || role === "student" || role === "participant") {
			return role;
		}

		return null;
	} catch {
		return null;
	}
}
