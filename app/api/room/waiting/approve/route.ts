import { type NextRequest, NextResponse } from "next/server";
import { createRealtimeKitParticipant, getOrRestoreRoom } from "@/lib/api-helpers";
import { requireGroupTeacher } from "@/lib/auth-helpers";
import { rooms } from "@/lib/room-store";
import { meetingRoomService } from "@/lib/services/meeting-room";

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

  if (!currentRoom.rtkMeetingId) {
    return NextResponse.json({ error: "No active RTK session" }, { status: 400 });
  }

  try {
    const result = await meetingRoomService.approveWaitingParticipant({
      room: currentRoom,
      participantName,
      role: "student",
      createParticipant: async () => {
        const { token } = await createRealtimeKitParticipant({
          room: currentRoom,
          rtkMeetingId: currentRoom.rtkMeetingId!,
          participantName,
          role: "student",
        });
        return { token };
      },
    });

    if (result.status === "not_in_waiting_room") {
      return NextResponse.json({ error: "Participant not in waiting room" }, { status: 404 });
    }

    currentRoom.approvedTokens.set(participantName, {
      token: result.token,
      role: result.role,
      groupId: currentRoom.groupId,
    });

    console.log(`[waiting/approve] Approved ${participantName} for meeting ${meetingId}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[waiting/approve] Failed to create RTK participant:", err);
    return NextResponse.json({ error: "Failed to approve participant" }, { status: 500 });
  }
}
