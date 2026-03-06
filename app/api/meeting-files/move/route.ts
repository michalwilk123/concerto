import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meeting } from "@/db/schema";
import { requireGroupTeacher } from "@/lib/auth-helpers";
import { moveFileById, parseFileId } from "@/lib/services/file-service";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const fileId: string | undefined = body?.fileId;
  const targetFolderId: string | null = body?.targetFolderId ?? null;

  if (!fileId) return NextResponse.json({ error: "fileId is required" }, { status: 400 });

  const parsed = parseFileId(fileId);
  if (!parsed || !parsed.meetingId) {
    return NextResponse.json({ error: "Invalid meeting file id" }, { status: 400 });
  }

  const [meetingRow] = await db
    .select({ groupId: meeting.groupId })
    .from(meeting)
    .where(eq(meeting.id, parsed.meetingId))
    .limit(1);
  if (!meetingRow) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  const { error } = await requireGroupTeacher(meetingRow.groupId);
  if (error) return error;

  try {
    const moved = await moveFileById(fileId, targetFolderId);
    return NextResponse.json(moved);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Move failed" },
      { status: 400 },
    );
  }
}
