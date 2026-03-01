import { type NextRequest, NextResponse } from "next/server";
import { getOrRestoreRoom } from "@/lib/api-helpers";
import { requireGroupTeacher } from "@/lib/auth-helpers";
import { kickAllActiveSessionParticipants } from "@/lib/realtimekit";
import { rooms } from "@/lib/room-store";

export async function POST(request: NextRequest) {
  const { meetingId } = await request.json();
  console.log(`[admin-leave] Request meetingId=${meetingId}`);
  if (!meetingId) {
    return NextResponse.json({ error: "Meeting ID required" }, { status: 400 });
  }

  const roomOrError = await getOrRestoreRoom(meetingId);
  if (roomOrError instanceof NextResponse) return roomOrError;

  const currentRoom = rooms.get(meetingId) ?? roomOrError;

  // Any group teacher can end the meeting
  const { error } = await requireGroupTeacher(currentRoom.groupId);
  if (error) return error;

  // Cancel any pending grace timer
  if (currentRoom.allTeachersLeftTimer) {
    clearTimeout(currentRoom.allTeachersLeftTimer);
    currentRoom.allTeachersLeftTimer = undefined;
  }

  // Kick all participants via RealtimeKit
  if (currentRoom.rtkMeetingId) {
    console.log(
      `[admin-leave] Kicking all active-session participants for rtkMeetingId=${currentRoom.rtkMeetingId}`,
    );
    try {
      await kickAllActiveSessionParticipants(currentRoom.rtkMeetingId);
      console.log(`[admin-leave] kick-all succeeded for rtkMeetingId=${currentRoom.rtkMeetingId}`);
    } catch (err) {
      // Log but don't abort — still clean up server state below.
      // Participants' WebRTC sessions will time out on their own.
      console.error("[admin-leave] kick-all failed (participants may linger briefly):", err);
    }
  }

  // Remove from in-memory store
  rooms.delete(meetingId);

  console.log(
    `[admin-leave] Meeting ${meetingId} ended by teacher, rtkMeetingId=${currentRoom.rtkMeetingId}`,
  );

  return NextResponse.json({ success: true });
}
