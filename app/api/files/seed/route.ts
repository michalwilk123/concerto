import { readFile } from "node:fs/promises";
import path from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import { requireGroupTeacher } from "@/lib/auth-helpers";
import { getMimeFromExtension } from "@/lib/file-helpers";
import { objectExists, putObject } from "@/lib/s3-client";
import { db } from "@/db";
import { file as fileTable } from "@/db/schema";

const SEED_FILES = ["Lenna.png", "wilhelm.wav", "zen_of_python.txt"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const groupId = body.groupId;

  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  const { error } = await requireGroupTeacher(groupId);
  if (error) return error;

  // Check if already seeded by looking for first seed file in S3
  const firstKey = `${groupId}/${SEED_FILES[0]}`;
  if (await objectExists(firstKey)) {
    return NextResponse.json({ message: "Already seeded" });
  }

  for (const filename of SEED_FILES) {
    const srcPath = path.join(process.cwd(), "public", "seed-files", filename);
    const key = `${groupId}/${filename}`;
    try {
      const buffer = await readFile(srcPath);
      const mimeType = getMimeFromExtension(filename);
      await putObject(key, buffer, mimeType);
      await db.insert(fileTable).values({
        id: key,
        name: filename,
        mimeType,
        size: buffer.length,
        groupId,
        folderId: null,
        uploadedById: null,
      }).onConflictDoNothing();
    } catch (err) {
      console.error(`Failed to seed ${filename}:`, err);
    }
  }

  return NextResponse.json({ message: "Seeded successfully" });
}
