import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meeting } from "@/db/schema";
import { requireGroupTeacher } from "@/lib/auth-helpers";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [row] = await db.select().from(meeting).where(eq(meeting.id, id)).limit(1);
  if (!row) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  return NextResponse.json(row);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [row] = await db.select().from(meeting).where(eq(meeting.id, id)).limit(1);
  if (!row) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const { error } = await requireGroupTeacher(row.groupId);
  if (error) return error;

  const body = await request.json();
  const { isPublic, requiresApproval } = body;

  if (isPublic !== undefined && typeof isPublic !== "boolean") {
    return NextResponse.json({ error: "isPublic must be a boolean" }, { status: 400 });
  }
  if (requiresApproval !== undefined && typeof requiresApproval !== "boolean") {
    return NextResponse.json({ error: "requiresApproval must be a boolean" }, { status: 400 });
  }
  if (isPublic === undefined && requiresApproval === undefined) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updateData: Record<string, boolean> = {};
  if (isPublic !== undefined) updateData.isPublic = isPublic;
  if (requiresApproval !== undefined) updateData.requiresApproval = requiresApproval;

  const [updated] = await db.update(meeting).set(updateData).where(eq(meeting.id, id)).returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [row] = await db.select().from(meeting).where(eq(meeting.id, id)).limit(1);
  if (!row) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const { error } = await requireGroupTeacher(row.groupId);
  if (error) return error;

  await db.delete(meeting).where(eq(meeting.id, id));

  return NextResponse.json({ success: true });
}
