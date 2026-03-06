import { and, eq, isNull } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { folder, meeting } from "@/db/schema";
import { requireGroupTeacher } from "@/lib/auth-helpers";
import { moveFileById, parseFileId } from "@/lib/services/file-service";

interface BulkItem {
  type: "file" | "folder";
  id: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const items: BulkItem[] = body?.items ?? [];
  const targetFolderId: string | null = body?.targetFolderId ?? null;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items is required" }, { status: 400 });
  }

  // Determine meetingId from first item
  let meetingId: string | null = null;
  for (const item of items) {
    if (item.type === "file") {
      const parsed = parseFileId(item.id);
      if (parsed?.meetingId) { meetingId = parsed.meetingId; break; }
    } else {
      const [f] = await db.select({ meetingId: folder.meetingId }).from(folder).where(eq(folder.id, item.id)).limit(1);
      if (f?.meetingId) { meetingId = f.meetingId; break; }
    }
  }

  if (!meetingId) return NextResponse.json({ error: "Could not determine meeting" }, { status: 400 });

  const [meetingRow] = await db
    .select({ groupId: meeting.groupId })
    .from(meeting)
    .where(eq(meeting.id, meetingId))
    .limit(1);
  if (!meetingRow) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  const { error } = await requireGroupTeacher(meetingRow.groupId);
  if (error) return error;

  const moved: string[] = [];
  const errors: { id: string; error: string }[] = [];

  for (const item of items) {
    try {
      if (item.type === "file") {
        await moveFileById(item.id, targetFolderId);
        moved.push(item.id);
      } else {
        const [f] = await db.select().from(folder).where(eq(folder.id, item.id)).limit(1);
        if (!f) { errors.push({ id: item.id, error: "Folder not found" }); continue; }

        // Name collision check
        const collision = await db
          .select({ id: folder.id })
          .from(folder)
          .where(
            and(
              eq(folder.meetingId, meetingId),
              eq(folder.name, f.name),
              targetFolderId ? eq(folder.parentId, targetFolderId) : isNull(folder.parentId),
            ),
          )
          .limit(1);
        if (collision.some((r) => r.id !== item.id)) {
          errors.push({ id: item.id, error: "A folder with this name already exists here" });
          continue;
        }

        await db.update(folder).set({ parentId: targetFolderId }).where(eq(folder.id, item.id));
        moved.push(item.id);
      }
    } catch (err) {
      errors.push({ id: item.id, error: err instanceof Error ? err.message : "Move failed" });
    }
  }

  return NextResponse.json({ moved, errors });
}
