import { rm } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { folder } from "@/db/schema";
import { requireAdmin, requireAuth } from "@/lib/auth-helpers";

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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const [folderDoc] = await db.select().from(folder).where(eq(folder.id, id)).limit(1);

  if (!folderDoc) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  if (folderDoc.isSystem) {
    return NextResponse.json({ error: "Cannot delete system folder" }, { status: 403 });
  }

  await deleteFolderRecursive(id, folderDoc.groupId);

  return NextResponse.json({ success: true });
}

async function deleteFolderRecursive(folderId: string, groupId: string) {
  // Delete files on disk for this folder
  const folderUploadDir = path.join(process.cwd(), "uploads", groupId, folderId);
  try {
    await rm(folderUploadDir, { recursive: true, force: true });
  } catch {
    // ignore if directory doesn't exist
  }

  // Find and delete child folders recursively
  const childFolders = await db
    .select()
    .from(folder)
    .where(eq(folder.parentId, folderId));

  for (const child of childFolders) {
    await deleteFolderRecursive(child.id, groupId);
  }

  // Delete this folder from DB
  await db.delete(folder).where(eq(folder.id, folderId));
}
