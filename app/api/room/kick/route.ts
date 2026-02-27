import { type NextRequest, NextResponse } from "next/server";
import { getOrRestoreRoom } from "@/lib/api-helpers";
import { requireGroupTeacher } from "@/lib/auth-helpers";
import {
  kickActiveSessionParticipants,
  listParticipants,
} from "@/lib/realtimekit";
import { rooms } from "@/lib/room-store";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { meetingId, targetIdentity } = body;
  console.log(`[room/kick] Request meetingId=${meetingId}, targetIdentity=${targetIdentity}`);

  const roomOrError = await getOrRestoreRoom(meetingId);
  if (roomOrError instanceof NextResponse) return roomOrError;

  const currentRoom = rooms.get(meetingId) ?? roomOrError;

  // Require group teacher to kick
  const { error } = await requireGroupTeacher(currentRoom.groupId);
  if (error) return error;

  if (!currentRoom.rtkMeetingId) {
    return NextResponse.json({ error: "No active RTK session" }, { status: 400 });
  }

  let participantEntry = currentRoom.participants.get(targetIdentity);
  let participantId = participantEntry?.rtkId;

  // Fallback: participant may have reconnected with a new RTK ID not tracked in our map
  if (!participantId) {
    try {
      const rtkParticipants = await listParticipants(currentRoom.rtkMeetingId);
      const match = rtkParticipants.find((p) => p.name === targetIdentity);
      if (!match) {
        // Already gone from the meeting — kick was effective
        console.log(`Kick requested for ${targetIdentity} but not found in RTK, already removed`);
        return NextResponse.json({ success: true });
      }
      participantId = match.id;
    } catch (err) {
      console.error("Failed to list RTK participants for kick fallback:", err);
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }
  }

  try {
    console.log(
      `[room/kick] Kicking via active-session: rtkMeetingId=${currentRoom.rtkMeetingId}, participantId=${participantId}`,
    );
    await kickActiveSessionParticipants({
      meetingId: currentRoom.rtkMeetingId,
      participantIds: [participantId],
    });
    currentRoom.participants.delete(targetIdentity);
    currentRoom.connectedTeachers.delete(targetIdentity);
    console.log(`Kicked ${targetIdentity} from meeting ${meetingId}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to kick participant:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to kick participant",
      },
      { status: 500 },
    );
  }
}
