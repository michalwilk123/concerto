import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { group } from "@/db/schema";
import { requireAdmin, requireGroupMember } from "@/lib/auth-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	const { error } = await requireGroupMember(id);
	if (error) return error;

	const [g] = await db.select().from(group).where(eq(group.id, id)).limit(1);
	if (!g) {
		return NextResponse.json({ error: "Group not found" }, { status: 404 });
	}

	return NextResponse.json(g);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	const { error } = await requireAdmin();
	if (error) return error;

	const body = await req.json();
	const { name } = body;

	if (!name || typeof name !== "string" || !name.trim()) {
		return NextResponse.json({ error: "Group name is required" }, { status: 400 });
	}

	const [updated] = await db
		.update(group)
		.set({ name: name.trim() })
		.where(eq(group.id, id))
		.returning();

	if (!updated) {
		return NextResponse.json({ error: "Group not found" }, { status: 404 });
	}

	return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	const { error } = await requireAdmin();
	if (error) return error;

	const [deleted] = await db.delete(group).where(eq(group.id, id)).returning();
	if (!deleted) {
		return NextResponse.json({ error: "Group not found" }, { status: 404 });
	}

	return NextResponse.json({ success: true });
}
