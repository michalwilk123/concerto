import { type NextRequest, NextResponse } from "next/server";
import { requireGroupTeacher } from "@/lib/auth-helpers";
import { moveFileById, parseFileId } from "@/lib/services/file-service";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const fileId = body?.fileId;
  const targetFolderId = body?.targetFolderId ?? null;

  if (typeof fileId !== "string" || !fileId.trim()) {
    return NextResponse.json({ error: "fileId is required" }, { status: 400 });
  }

  const parsed = parseFileId(fileId);
  if (!parsed) return NextResponse.json({ error: "Invalid fileId" }, { status: 400 });

  const { error } = await requireGroupTeacher(parsed.groupId!);
  if (error) return error;

  try {
    const result = await moveFileById(fileId, targetFolderId);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Move failed";
    const status = msg.includes("already exists") ? 409 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
