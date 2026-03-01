import { and, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { folder, meeting } from "@/db/schema";
import { requireGroupTeacher } from "@/lib/auth-helpers";
import { rooms } from "@/lib/room-store";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { displayName, groupId, isPublic = false, requiresApproval = false } = body;

  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  const { error, session } = await requireGroupTeacher(groupId);
  if (error) return error;

  const creatorName = displayName || session?.user.name;
  const dbMeetingId = nanoid();
  const meetingName = `${creatorName || "Meeting"}'s meeting`;

  try {
    await db
      .insert(meeting)
      .values({ id: dbMeetingId, name: meetingName, groupId, isPublic, requiresApproval });
  } catch (err) {
    console.error("[room/create] Failed to persist meeting:", err);
    return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 });
  }

  // Auto-create a dashboard folder for this meeting
  try {
    // Find or create the "meetings" system folder for this group
    let [meetingsFolder] = await db
      .select()
      .from(folder)
      .where(
        and(
          eq(folder.groupId, groupId),
          eq(folder.isSystem, true),
          eq(folder.name, "meetings"),
          isNull(folder.parentId),
        ),
      )
      .limit(1);

    if (!meetingsFolder) {
      const [created] = await db
        .insert(folder)
        .values({ id: nanoid(), name: "meetings", groupId, parentId: null, isSystem: true })
        .returning();
      meetingsFolder = created;
    }

    // Create subfolder for this meeting using meetingId as folder id
    await db.insert(folder).values({
      id: dbMeetingId,
      name: meetingName,
      groupId,
      parentId: meetingsFolder.id,
      isSystem: false,
    });
  } catch (err) {
    console.error("[room/create] Failed to create meeting folder:", err);
    // Non-fatal — meeting still works without the folder
  }

  rooms.set(dbMeetingId, {
    groupId,
    rtkMeetingId: null,
    participants: new Map(),
    connectedTeachers: new Set(),
    waitingRoom: new Map(),
    approvedTokens: new Map(),
    rejectedParticipants: new Set(),
  });

  console.log(
    `[room/create] Room created: meetingId=${dbMeetingId}, creator=${creatorName}, groupId=${groupId}`,
  );

  return NextResponse.json({ success: true, meetingId: dbMeetingId });
}
