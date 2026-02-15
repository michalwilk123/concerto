import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "./auth";

export async function getSessionOrNull() {
	try {
		const h = await headers();
		return await auth.api.getSession({ headers: h });
	} catch (e) {
		console.error("getSessionOrNull error:", e);
		return null;
	}
}

export async function requireAdmin() {
	const session = await getSessionOrNull();

	if (!session) {
		return {
			error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
			session: null,
		};
	}

	console.log("requireAdmin session user:", JSON.stringify(session.user));

	if (session.user.role !== "admin") {
		return {
			error: NextResponse.json({ error: "Admin access required" }, { status: 403 }),
			session: null,
		};
	}

	return { error: null, session };
}
