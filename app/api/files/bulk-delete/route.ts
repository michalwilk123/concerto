import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { folder } from "@/db/schema";
import { requireGroupTeacher } from "@/lib/auth-helpers";
import { deleteFileById, parseFileId } from "@/lib/services/file-service";
import { deleteObjects, listObjects } from "@/lib/s3-client";

interface BulkItem {
  type: "file" | "folder";
  id: string;
}

async function deleteFolderRecursive(folderId: string, groupId: string) {
  // Delete all S3 objects in this folder prefix
  const prefix = `${groupId}/${folderId}/`;
  const objects = await listObjects(prefix);
  if (objects.length > 0) {
    await deleteObjects(objects.map((o) => o.key));
  }

  // Recursively delete child folders
  const children = await db.select().from(folder).where(eq(folder.parentId, folderId));
  for (const child of children) {
    await deleteFolderRecursive(child.id, groupId);
  }

  await db.delete(folder).where(eq(folder.id, folderId));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const items: BulkItem[] = body?.items ?? [];

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items is required" }, { status: 400 });
  }

  // Determine groupId from first file item
  let groupId: string | null = null;
  for (const item of items) {
    if (item.type === "file") {
      const parsed = parseFileId(item.id);
      if (parsed) { groupId = parsed.groupId; break; }
    } else {
      const [f] = await db.select({ groupId: folder.groupId }).from(folder).where(eq(folder.id, item.id)).limit(1);
      if (f) { groupId = f.groupId; break; }
    }
  }

  if (!groupId) return NextResponse.json({ error: "Could not determine group" }, { status: 400 });

  const { error } = await requireGroupTeacher(groupId);
  if (error) return error;

  const deleted: string[] = [];
  const errors: { id: string; error: string }[] = [];

  for (const item of items) {
    try {
      if (item.type === "file") {
        await deleteFileById(item.id);
        deleted.push(item.id);
      } else {
        const [f] = await db.select().from(folder).where(eq(folder.id, item.id)).limit(1);
        if (!f) { errors.push({ id: item.id, error: "Folder not found" }); continue; }
        await deleteFolderRecursive(item.id, f.groupId);
        deleted.push(item.id);
      }
    } catch (err) {
      errors.push({ id: item.id, error: err instanceof Error ? err.message : "Delete failed" });
    }
  }

  return NextResponse.json({ deleted, errors });
}
