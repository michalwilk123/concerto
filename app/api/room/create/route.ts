import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meeting } from "@/db/schema";
import { requireGroupTeacher } from "@/lib/auth-helpers";
import { ensureMeetingFolder } from "@/lib/file-helpers";
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

  // Auto-create folder hierarchy: meetings/{meetingName}/
  let meetingFolderId: string | undefined;
  try {
    meetingFolderId = await ensureMeetingFolder(groupId, creatorName || dbMeetingId);
    console.log(
      `[room/create] Meeting folder created/found: meetingFolderId=${meetingFolderId}, name="${creatorName || dbMeetingId}"`,
    );
  } catch (err) {
    console.error("[room/create] Failed to create meeting folder (non-blocking):", err);
  }

  rooms.set(dbMeetingId, {
    groupId,
    rtkMeetingId: null,
    meetingFolderId,
    participants: new Map(),
    connectedTeachers: new Set(),
    waitingRoom: new Map(),
    approvedTokens: new Map(),
    rejectedParticipants: new Set(),
  });

  console.log(
    `[room/create] Room created: meetingId=${dbMeetingId}, meetingFolderId=${meetingFolderId ?? "NONE"}, creator=${creatorName}, groupId=${groupId}`,
  );

  return NextResponse.json({ success: true, meetingId: dbMeetingId });
}
