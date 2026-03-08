import { and, eq, isNull, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { folder } from "@/db/schema";
import { requireAdmin, requireAuth, requireGroupTeacher } from "@/lib/auth-helpers";
import { deleteObjects, listObjects } from "@/lib/s3-client";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await requireAuth();
  if (error) return error;

  const [folderDoc] = await db.select().from(folder).where(eq(folder.id, id)).limit(1);
  if (!folderDoc) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  return NextResponse.json(folderDoc);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [folderDoc] = await db.select().from(folder).where(eq(folder.id, id)).limit(1);
  if (!folderDoc) return NextResponse.json({ error: "Folder not found" }, { status: 404 });

  const { error } = await requireGroupTeacher(folderDoc.groupId);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const { parentId, name } = body ?? {};

  if (parentId !== undefined) {
    // Move: circular reference check
    const descendants = await db.execute(sql`
      WITH RECURSIVE desc_chain AS (
        SELECT id FROM folder WHERE parent_id = ${id}
        UNION ALL
        SELECT f.id FROM folder f JOIN desc_chain d ON f.parent_id = d.id
      )
      SELECT id FROM desc_chain WHERE id = ${parentId}
    `);
    if (Array.from(descendants).length > 0) {
      return NextResponse.json({ error: "Cannot move folder into its own descendant" }, { status: 400 });
    }

    // Name collision check at target parent
    const collision = await db
      .select({ id: folder.id })
      .from(folder)
      .where(
        and(
          eq(folder.groupId, folderDoc.groupId),
          eq(folder.name, folderDoc.name),
          parentId ? eq(folder.parentId, parentId) : isNull(folder.parentId),
          // exclude self
        ),
      )
      .limit(1);
    // Filter out self
    if (collision.some((r) => r.id !== id)) {
      return NextResponse.json({ error: "A folder with this name already exists here" }, { status: 409 });
    }

    await db.update(folder).set({ parentId: parentId || null }).where(eq(folder.id, id));
  }

  if (name !== undefined && typeof name === "string" && name.trim()) {
    const trimmed = name.trim();
    // Collision check at current parent
    const parentCondition = folderDoc.parentId
      ? eq(folder.parentId, folderDoc.parentId)
      : isNull(folder.parentId);
    const collision = await db
      .select({ id: folder.id })
      .from(folder)
      .where(and(eq(folder.groupId, folderDoc.groupId), eq(folder.name, trimmed), parentCondition))
      .limit(1);
    if (collision.some((r) => r.id !== id)) {
      return NextResponse.json({ error: "A folder with this name already exists here" }, { status: 409 });
    }
    await db.update(folder).set({ name: trimmed }).where(eq(folder.id, id));
  }

  const [updated] = await db.select().from(folder).where(eq(folder.id, id)).limit(1);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const [folderDoc] = await db.select().from(folder).where(eq(folder.id, id)).limit(1);

  if (!folderDoc) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  await deleteFolderRecursive(id, folderDoc.groupId);

  return NextResponse.json({ success: true });
}

async function deleteFolderRecursive(folderId: string, groupId: string) {
  const objects = await listObjects(`${groupId}/${folderId}/`);
  if (objects.length > 0) {
    await deleteObjects(objects.map((o) => o.key));
  }

  const childFolders = await db.select().from(folder).where(eq(folder.parentId, folderId));

  for (const child of childFolders) {
    await deleteFolderRecursive(child.id, groupId);
  }

  await db.delete(folder).where(eq(folder.id, folderId));
}
