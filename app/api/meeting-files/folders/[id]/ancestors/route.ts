import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { folder, meeting } from "@/db/schema";
import { requireGroupMember } from "@/lib/auth-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [folderDoc] = await db.select().from(folder).where(eq(folder.id, id)).limit(1);
  if (!folderDoc || !folderDoc.meetingId) {
    return NextResponse.json({ error: "Meeting folder not found" }, { status: 404 });
  }

  const [meetingRow] = await db
    .select({ groupId: meeting.groupId })
    .from(meeting)
    .where(eq(meeting.id, folderDoc.meetingId))
    .limit(1);
  if (!meetingRow) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  const { error } = await requireGroupMember(meetingRow.groupId);
  if (error) return error;

  const ancestors = await db.execute(sql`
    WITH RECURSIVE chain AS (
      SELECT id, name, group_id, parent_id, is_system, meeting_id, created_at, 0 AS depth
      FROM folder
      WHERE id = ${id}
      UNION ALL
      SELECT f.id, f.name, f.group_id, f.parent_id, f.is_system, f.meeting_id, f.created_at, c.depth + 1
      FROM folder f
      JOIN chain c ON f.id = c.parent_id
      WHERE c.depth < 50
    )
    SELECT id, name, group_id AS "groupId", parent_id AS "parentId",
           is_system AS "isSystem", meeting_id AS "meetingId", created_at AS "createdAt"
    FROM chain
    ORDER BY depth DESC
  `);

  return NextResponse.json(Array.from(ancestors));
}
