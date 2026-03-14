import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meeting } from "@/db/schema";
import { requireAuth, requireGroupMember } from "@/lib/auth-helpers";
import { createEmptyRoom, rooms } from "@/lib/room-store";
import { getSessionFromRequest } from "../../../auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  const { meetingId } = await params;

  const rawSession = await getSessionFromRequest(req);
  const { error: authError, session } = await requireAuth(rawSession);
  if (authError) return authError;

  const [existingMeeting] = await db
    .select()
    .from(meeting)
    .where(eq(meeting.id, meetingId))
    .limit(1);

  if (!existingMeeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const { error } = await requireGroupMember(existingMeeting.groupId, session);
  if (error) return error;

  if (rooms.has(meetingId)) {
    return NextResponse.json({ success: true, meetingId });
  }

  rooms.set(meetingId, createEmptyRoom(existingMeeting.groupId, existingMeeting.rtkMeetingId));

  return NextResponse.json({ success: true, meetingId });
}
