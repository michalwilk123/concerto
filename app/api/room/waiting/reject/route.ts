import { type NextRequest, NextResponse } from "next/server";
import { getOrRestoreRoom } from "@/lib/api-helpers";
import { requireGroupTeacher } from "@/lib/auth-helpers";
import { rooms } from "@/lib/room-store";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { meetingId, participantName } = body;

  if (!meetingId || !participantName) {
    return NextResponse.json({ error: "meetingId and participantName required" }, { status: 400 });
  }

  const roomOrError = await getOrRestoreRoom(meetingId);
  if (roomOrError instanceof NextResponse) return roomOrError;

  const currentRoom = rooms.get(meetingId) ?? roomOrError;

  const { error } = await requireGroupTeacher(currentRoom.groupId);
  if (error) return error;

  currentRoom.waitingRoom.delete(participantName);
  currentRoom.rejectedParticipants.add(participantName);

  console.log(`[waiting/reject] Rejected ${participantName} from meeting ${meetingId}`);
  return NextResponse.json({ success: true });
}
