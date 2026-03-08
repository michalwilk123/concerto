import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meeting } from "@/db/schema";
import { requireGroupMember } from "@/lib/auth-helpers";
import { createEmptyRoom, rooms } from "@/lib/room-store";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { meetingId, groupId } = body;

  if (!meetingId || !groupId) {
    return NextResponse.json({ error: "meetingId and groupId are required" }, { status: 400 });
  }

  const { error, session } = await requireGroupMember(groupId);
  if (error) return error;

  // Verify the meeting exists and belongs to this group
  const [existingMeeting] = await db
    .select()
    .from(meeting)
    .where(eq(meeting.id, meetingId))
    .limit(1);

  if (!existingMeeting || existingMeeting.groupId !== groupId) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  // If there's already an active in-memory room for this meeting, just return its ID
  if (rooms.has(meetingId)) {
    console.log(`[room/rejoin] Meeting ${meetingId} already active, returning existing`);
    return NextResponse.json({ success: true, meetingId });
  }

  rooms.set(meetingId, createEmptyRoom(groupId, existingMeeting.rtkMeetingId));

  console.log(`[room/rejoin] Rejoined meeting: meetingId=${meetingId}, groupId=${groupId}`);

  return NextResponse.json({ success: true, meetingId });
}
