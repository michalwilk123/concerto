import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { group, groupMember } from "@/db/schema";
import { requireAdmin, requireAuth } from "@/lib/auth-helpers";

export async function GET() {
	const { error, session } = await requireAuth();
	if (error) return error;

	// Admin sees all groups
	if (session.user.role === "admin") {
		const groups = await db.select().from(group);
		return NextResponse.json(groups);
	}

	// Regular users see only their groups
	const memberships = await db
		.select({ group })
		.from(groupMember)
		.innerJoin(group, eq(groupMember.groupId, group.id))
		.where(eq(groupMember.userId, session.user.id));

	return NextResponse.json(memberships.map((m) => m.group));
}

export async function POST(req: NextRequest) {
	const { error, session } = await requireAdmin();
	if (error) return error;

	const body = await req.json();
	const { name } = body;

	if (!name || typeof name !== "string" || !name.trim()) {
		return NextResponse.json({ error: "Group name is required" }, { status: 400 });
	}

	const groupId = nanoid();
	const [inserted] = await db.insert(group).values({ id: groupId, name: name.trim() }).returning();

	return NextResponse.json(inserted, { status: 201 });
}
