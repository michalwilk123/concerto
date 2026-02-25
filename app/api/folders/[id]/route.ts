import { unlink } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { file, folder } from "@/db/schema";
import { getSessionOrNull, requireAdmin } from "@/lib/auth-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const session = await getSessionOrNull();
	if (!session) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	const [folderDoc] = await db.select().from(folder).where(eq(folder.id, id)).limit(1);
	if (!folderDoc) {
		return NextResponse.json({ error: "Folder not found" }, { status: 404 });
	}

	return NextResponse.json(folderDoc);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { error, session } = await requireAdmin();
	if (error) return error;

	const { id } = await params;

	const [folderDoc] = await db.select().from(folder).where(eq(folder.id, id)).limit(1);

	if (!folderDoc) {
		return NextResponse.json({ error: "Folder not found" }, { status: 404 });
	}

	if (folderDoc.isSystem) {
		return NextResponse.json({ error: "Cannot delete system folder" }, { status: 403 });
	}

	// Recursively delete all contents
	await deleteFolderRecursive(id);

	return NextResponse.json({ success: true });
}

async function deleteFolderRecursive(folderId: string) {
	// Delete files in this folder (from disk and DB)
	const filesInFolder = await db.select().from(file).where(eq(file.folderId, folderId));

	for (const f of filesInFolder) {
		const fullPath = path.join(process.cwd(), "uploads", f.storagePath);
		try {
			await unlink(fullPath);
		} catch {
			/* ignore */
		}
	}
	await db.delete(file).where(eq(file.folderId, folderId));

	// Find and delete child folders recursively
	const childFolders = await db.select().from(folder).where(eq(folder.parentId, folderId));

	for (const child of childFolders) {
		await deleteFolderRecursive(child.id);
	}

	// Delete this folder
	await db.delete(folder).where(eq(folder.id, folderId));
}
