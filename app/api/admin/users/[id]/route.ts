import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";

const VALID_ROLES = ["admin", "teacher", "student"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { error, session } = await requireAdmin();
	if (error) return error;

	const { id } = await params;

	if (id === session.user.id) {
		return NextResponse.json({ error: "Cannot modify your own account" }, { status: 400 });
	}

	const body = await req.json();
	const updates: Record<string, unknown> = {};

	if ("role" in body) {
		if (!VALID_ROLES.includes(body.role)) {
			return NextResponse.json(
				{ error: "Invalid role. Must be admin, teacher, or student" },
				{ status: 400 },
			);
		}
		updates.role = body.role;
	}

	if ("isActive" in body) {
		updates.isActive = Boolean(body.isActive);
	}

	if ("banned" in body) {
		updates.banned = Boolean(body.banned);
	}

	if ("banReason" in body) {
		updates.banReason = body.banReason || null;
	}

	if (Object.keys(updates).length === 0) {
		return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
	}

	updates.updatedAt = new Date();

	const [updated] = await db.update(user).set(updates).where(eq(user.id, id)).returning({
		id: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
		banned: user.banned,
		banReason: user.banReason,
		isActive: user.isActive,
		createdAt: user.createdAt,
		image: user.image,
	});

	if (!updated) {
		return NextResponse.json({ error: "User not found" }, { status: 404 });
	}

	return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { error, session } = await requireAdmin();
	if (error) return error;

	const { id } = await params;

	if (id === session.user.id) {
		return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
	}

	const [deleted] = await db.delete(user).where(eq(user.id, id)).returning({ id: user.id });

	if (!deleted) {
		return NextResponse.json({ error: "User not found" }, { status: 404 });
	}

	return NextResponse.json({ success: true });
}
