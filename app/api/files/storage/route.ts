import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import { requireGroupMember } from "@/lib/auth-helpers";

async function dirSize(dirPath: string): Promise<number> {
  let total = 0;
  try {
    const entries = await readdir(dirPath);
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      try {
        const s = await stat(fullPath);
        if (s.isFile()) {
          total += s.size;
        } else if (s.isDirectory()) {
          total += await dirSize(fullPath);
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // directory doesn't exist yet
  }
  return total;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");

  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  const { error } = await requireGroupMember(groupId);
  if (error) return error;

  const uploadDir = path.join(process.cwd(), "uploads", groupId);
  const totalBytes = await dirSize(uploadDir);

  return NextResponse.json({ totalBytes });
}
