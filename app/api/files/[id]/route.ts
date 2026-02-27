import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { file } from "@/db/schema";
import { requireGroupMember, requireGroupTeacher } from "@/lib/auth-helpers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [fileDoc] = await db.select().from(file).where(eq(file.id, id)).limit(1);
  if (!fileDoc) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Require group membership to access file
  const { error } = await requireGroupMember(fileDoc.groupId);
  if (error) return error;

  const fullPath = path.join(process.cwd(), "uploads", fileDoc.storagePath);

  try {
    const buffer = await readFile(fullPath);
    const download = new URL(req.url).searchParams.get("download") === "true";

    const headers: Record<string, string> = {
      "Content-Type": fileDoc.mimeType,
      "Content-Length": String(buffer.length),
    };

    if (download) {
      headers["Content-Disposition"] = `attachment; filename="${fileDoc.name}"`;
    } else {
      headers["Content-Disposition"] = `inline; filename="${fileDoc.name}"`;
    }

    return new NextResponse(buffer, { headers });
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [fileDoc] = await db.select().from(file).where(eq(file.id, id)).limit(1);
  if (!fileDoc) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const { error } = await requireGroupTeacher(fileDoc.groupId);
  if (error) return error;

  // Delete from disk
  const fullPath = path.join(process.cwd(), "uploads", fileDoc.storagePath);
  try {
    await unlink(fullPath);
  } catch {
    // File may already be gone from disk
  }

  // Delete from DB
  await db.delete(file).where(eq(file.id, id));

  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [fileDoc] = await db.select().from(file).where(eq(file.id, id)).limit(1);
  if (!fileDoc) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const { error } = await requireGroupTeacher(fileDoc.groupId);
  if (error) return error;

  const body = await req.json();
  const updates: Partial<{ isEditable: boolean }> = {};

  if (typeof body.isEditable === "boolean") {
    updates.isEditable = body.isEditable;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const [updated] = await db.update(file).set(updates).where(eq(file.id, id)).returning();

  return NextResponse.json(updated);
}
