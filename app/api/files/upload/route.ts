import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { file } from "@/db/schema";
import { requireGroupTeacher } from "@/lib/auth-helpers";
import { sanitizeFileName, validateFileSize } from "@/lib/file-helpers";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const groupId = formData.get("groupId") as string | null;
  const uploadedFile = formData.get("file") as File | null;
  const folderId = formData.get("folderId") as string | null;

  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  const { error, session } = await requireGroupTeacher(groupId);
  if (error) return error;

  if (!uploadedFile) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!validateFileSize(uploadedFile.size)) {
    return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
  }

  const userId = session?.user.id;
  const fileId = nanoid();
  const safeName = sanitizeFileName(uploadedFile.name);
  const storagePath = `${groupId}/${fileId}-${safeName}`;
  const fullPath = path.join(process.cwd(), "uploads", storagePath);

  await mkdir(path.dirname(fullPath), { recursive: true });

  const buffer = Buffer.from(await uploadedFile.arrayBuffer());
  await writeFile(fullPath, buffer);

  const [inserted] = await db
    .insert(file)
    .values({
      id: fileId,
      name: uploadedFile.name,
      mimeType: uploadedFile.type || "application/octet-stream",
      size: uploadedFile.size,
      storagePath,
      groupId,
      uploadedById: userId,
      folderId: folderId || null,
    })
    .returning();

  return NextResponse.json(inserted);
}
