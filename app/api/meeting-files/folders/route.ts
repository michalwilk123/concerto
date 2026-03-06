import { and, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { folder, meeting } from "@/db/schema";
import { requireGroupMember, requireGroupTeacher } from "@/lib/auth-helpers";

async function getMeetingGroupId(meetingId: string): Promise<string | null> {
  const [row] = await db
    .select({ groupId: meeting.groupId })
    .from(meeting)
    .where(eq(meeting.id, meetingId))
    .limit(1);
  return row?.groupId ?? null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const meetingId = searchParams.get("meetingId");
  if (!meetingId) return NextResponse.json({ error: "meetingId is required" }, { status: 400 });

  const groupId = await getMeetingGroupId(meetingId);
  if (!groupId) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  const { error } = await requireGroupMember(groupId);
  if (error) return error;

  const parentId = searchParams.get("parentId") || null;
  const whereClause = parentId
    ? and(eq(folder.meetingId, meetingId), eq(folder.parentId, parentId))
    : and(eq(folder.meetingId, meetingId), isNull(folder.parentId));

  const folders = await db.select().from(folder).where(whereClause);
  return NextResponse.json(folders);
}

export async function POST(req: NextRequest) {
  const { name, meetingId, parentId } = await req.json();

  if (!meetingId) return NextResponse.json({ error: "meetingId is required" }, { status: 400 });
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
  }

  const groupId = await getMeetingGroupId(meetingId);
  if (!groupId) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  const { error } = await requireGroupTeacher(groupId);
  if (error) return error;

  const trimmedName = name.trim();
  const parentCondition = parentId ? eq(folder.parentId, parentId) : isNull(folder.parentId);

  const existing = await db
    .select({ id: folder.id })
    .from(folder)
    .where(and(eq(folder.meetingId, meetingId), eq(folder.name, trimmedName), parentCondition))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "A folder with this name already exists here" },
      { status: 409 },
    );
  }

  const [inserted] = await db
    .insert(folder)
    .values({
      id: nanoid(),
      name: trimmedName,
      groupId,
      parentId: parentId || null,
      meetingId,
      isSystem: false,
    })
    .returning();

  return NextResponse.json(inserted);
}
