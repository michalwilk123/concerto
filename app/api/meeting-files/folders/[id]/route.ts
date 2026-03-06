import { and, eq, isNull } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { folder, meeting } from "@/db/schema";
import { requireGroupMember, requireGroupTeacher } from "@/lib/auth-helpers";
import { deleteObjects, listObjects } from "@/lib/s3-client";

async function getMeetingGroupId(meetingId: string): Promise<string | null> {
  const [row] = await db
    .select({ groupId: meeting.groupId })
    .from(meeting)
    .where(eq(meeting.id, meetingId))
    .limit(1);
  return row?.groupId ?? null;
}

async function deleteMeetingFolderRecursive(folderId: string, meetingId: string) {
  // Delete all S3 objects under this meeting folder prefix
  const prefix = `meetings/${meetingId}/${folderId}/`;
  const objects = await listObjects(prefix);
  if (objects.length > 0) {
    await deleteObjects(objects.map((o) => o.key));
  }

  // Recursively delete child folders
  const children = await db.select().from(folder).where(eq(folder.parentId, folderId));
  for (const child of children) {
    await deleteMeetingFolderRecursive(child.id, meetingId);
  }

  await db.delete(folder).where(eq(folder.id, folderId));
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [folderDoc] = await db.select().from(folder).where(eq(folder.id, id)).limit(1);
  if (!folderDoc) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  if (!folderDoc.meetingId) return NextResponse.json({ error: "Not a meeting folder" }, { status: 400 });

  const groupId = await getMeetingGroupId(folderDoc.meetingId);
  if (!groupId) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  const { error } = await requireGroupMember(groupId);
  if (error) return error;

  return NextResponse.json(folderDoc);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [folderDoc] = await db.select().from(folder).where(eq(folder.id, id)).limit(1);
  if (!folderDoc) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  if (!folderDoc.meetingId) return NextResponse.json({ error: "Not a meeting folder" }, { status: 400 });

  const groupId = await getMeetingGroupId(folderDoc.meetingId);
  if (!groupId) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  const { error } = await requireGroupTeacher(groupId);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const { name, parentId } = body ?? {};

  if (name !== undefined && typeof name === "string" && name.trim()) {
    const trimmed = name.trim();
    const parentCondition = folderDoc.parentId
      ? eq(folder.parentId, folderDoc.parentId)
      : isNull(folder.parentId);
    const collision = await db
      .select({ id: folder.id })
      .from(folder)
      .where(and(eq(folder.meetingId, folderDoc.meetingId), eq(folder.name, trimmed), parentCondition))
      .limit(1);
    if (collision.some((r) => r.id !== id)) {
      return NextResponse.json({ error: "A folder with this name already exists here" }, { status: 409 });
    }
    await db.update(folder).set({ name: trimmed }).where(eq(folder.id, id));
  }

  if (parentId !== undefined) {
    const newParentId = parentId || null;
    const collision = await db
      .select({ id: folder.id })
      .from(folder)
      .where(
        and(
          eq(folder.meetingId, folderDoc.meetingId),
          eq(folder.name, folderDoc.name),
          newParentId ? eq(folder.parentId, newParentId) : isNull(folder.parentId),
        ),
      )
      .limit(1);
    if (collision.some((r) => r.id !== id)) {
      return NextResponse.json({ error: "A folder with this name already exists here" }, { status: 409 });
    }
    await db.update(folder).set({ parentId: newParentId }).where(eq(folder.id, id));
  }

  const [updated] = await db.select().from(folder).where(eq(folder.id, id)).limit(1);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [folderDoc] = await db.select().from(folder).where(eq(folder.id, id)).limit(1);
  if (!folderDoc) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  if (!folderDoc.meetingId) return NextResponse.json({ error: "Not a meeting folder" }, { status: 400 });

  const groupId = await getMeetingGroupId(folderDoc.meetingId);
  if (!groupId) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  const { error } = await requireGroupTeacher(groupId);
  if (error) return error;

  await deleteMeetingFolderRecursive(id, folderDoc.meetingId);
  return NextResponse.json({ success: true });
}
