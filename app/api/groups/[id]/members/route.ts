import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { groupMember, user } from "@/db/schema";
import { requireGroupMember, requireGroupTeacher } from "@/lib/auth-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: groupId } = await params;

  const { error } = await requireGroupMember(groupId);
  if (error) return error;

  const members = await db
    .select({
      id: groupMember.id,
      groupId: groupMember.groupId,
      userId: groupMember.userId,
      role: groupMember.role,
      createdAt: groupMember.createdAt,
      userName: user.name,
      userEmail: user.email,
    })
    .from(groupMember)
    .innerJoin(user, eq(groupMember.userId, user.id))
    .where(eq(groupMember.groupId, groupId));

  return NextResponse.json(members);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: groupId } = await params;

  const { error } = await requireGroupTeacher(groupId);
  if (error) return error;

  const body = await req.json();
  const { userId, role } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  if (role && role !== "teacher" && role !== "student") {
    return NextResponse.json({ error: "role must be 'teacher' or 'student'" }, { status: 400 });
  }

  // Check if user exists
  const [existingUser] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  if (!existingUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check if already a member
  const [existing] = await db
    .select()
    .from(groupMember)
    .where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, userId)))
    .limit(1);

  if (existing) {
    // Update role if different
    if (role && existing.role !== role) {
      const [updated] = await db
        .update(groupMember)
        .set({ role })
        .where(eq(groupMember.id, existing.id))
        .returning();
      return NextResponse.json(updated);
    }
    return NextResponse.json(existing);
  }

  const [inserted] = await db
    .insert(groupMember)
    .values({
      id: nanoid(),
      groupId,
      userId,
      role: role || "student",
    })
    .returning();

  return NextResponse.json(inserted, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: groupId } = await params;

  const { error } = await requireGroupTeacher(groupId);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId query param is required" }, { status: 400 });
  }

  const [deleted] = await db
    .delete(groupMember)
    .where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, userId)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
