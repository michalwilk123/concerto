import { ilike, or } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { requireAuth } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
	const { error, session } = await requireAuth();
	if (error) return error;

	if (session.user.role !== "admin" && session.user.role !== "teacher") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const q = new URL(req.url).searchParams.get("q")?.trim() || "";
	if (q.length < 2) {
		return NextResponse.json([]);
	}

	const results = await db
		.select({ id: user.id, name: user.name, email: user.email })
		.from(user)
		.where(or(ilike(user.name, `%${q}%`), ilike(user.email, `%${q}%`)))
		.limit(20);

	return NextResponse.json(results);
}
