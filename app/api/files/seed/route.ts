import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import { requireGroupTeacher } from "@/lib/auth-helpers";

const SEED_FILES = ["Lenna.png", "wilhelm.wav", "zen_of_python.txt"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const groupId = body.groupId;

  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  const { error } = await requireGroupTeacher(groupId);
  if (error) return error;

  const seedDir = path.join(process.cwd(), "uploads", groupId);

  // Check if already seeded by looking for first seed file on disk
  try {
    await stat(path.join(seedDir, SEED_FILES[0]));
    return NextResponse.json({ message: "Already seeded" });
  } catch {
    // Not found, proceed with seeding
  }

  await mkdir(seedDir, { recursive: true });

  for (const filename of SEED_FILES) {
    const srcPath = path.join(process.cwd(), "public", "seed-files", filename);
    const destPath = path.join(seedDir, filename);
    try {
      const buffer = await readFile(srcPath);
      await writeFile(destPath, buffer);
    } catch (err) {
      console.error(`Failed to seed ${filename}:`, err);
    }
  }

  return NextResponse.json({ message: "Seeded successfully" });
}
