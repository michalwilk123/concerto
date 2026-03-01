import { type NextRequest, NextResponse } from "next/server";
import { getOrRestoreRoom } from "@/lib/api-helpers";
import { requireGroupTeacher } from "@/lib/auth-helpers";
import {
  kickActiveSessionParticipants,
  listParticipants,
} from "@/lib/realtimekit";
import { rooms } from "@/lib/room-store";
import { meetingRoomService } from "@/lib/services/meeting-room";

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

  try {
    const result = await meetingRoomService.kickParticipant({
      room: currentRoom,
      participantName: targetIdentity,
      listParticipants: async () => {
        const rtkParticipants = await listParticipants(currentRoom.rtkMeetingId!);
        return rtkParticipants.map((participant) => ({ id: participant.id, name: participant.name }));
      },
      kickParticipants: async (participantIds) => {
        console.log(
          `[room/kick] Kicking via active-session: rtkMeetingId=${currentRoom.rtkMeetingId}, participantId=${participantIds.join(",")}`,
        );
        await kickActiveSessionParticipants({
          meetingId: currentRoom.rtkMeetingId!,
          participantIds,
        });
      },
    });

    if (result.status === "no_active_session") {
      return NextResponse.json({ error: "No active RTK session" }, { status: 400 });
    }

    if (result.status === "participant_not_found") {
      console.log(`Kick requested for ${targetIdentity} but not found in RTK, already removed`);
      return NextResponse.json({ success: true });
    }

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
