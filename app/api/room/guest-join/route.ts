import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meeting } from "@/db/schema";
import {
  createRealtimeKitParticipant,
  ensureRealtimeKitMeeting,
  getOrRestoreRoom,
} from "@/lib/api-helpers";
import { rooms } from "@/lib/room-store";
import { meetingRoomService } from "@/lib/services/meeting-room";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { meetingId, participantName } = body;

  if (!meetingId || !participantName) {
    return NextResponse.json(
      { error: "Meeting ID and participant name required" },
      { status: 400 },
    );
  }

  const roomOrError = await getOrRestoreRoom(meetingId);
  if (roomOrError instanceof NextResponse) return roomOrError;
  const room = roomOrError;

  // Block guests from private meetings
  const [meetingRow] = await db.select().from(meeting).where(eq(meeting.id, meetingId)).limit(1);

  if (meetingRow && !meetingRow.isPublic) {
    return NextResponse.json(
      { error: "This meeting is private. You need to be a group member to join." },
      { status: 403 },
    );
  }

  let currentRoom = rooms.get(meetingId) ?? room;
  try {
    currentRoom = await ensureRealtimeKitMeeting(meetingId, "room/guest-join");
  } catch (err) {
    console.error("Failed to create RTK meeting:", err);
    return NextResponse.json(
      { error: "Failed to create meeting. Check RealtimeKit configuration." },
      { status: 502 },
    );
  }

  const role = "student" as const;

  try {
    const joinResult = await meetingRoomService.joinMeeting({
      room: currentRoom,
      participantName,
      role,
      requiresApproval: meetingRow?.requiresApproval === true,
      createParticipant: async () => {
        console.log(
          `[room/guest-join] Adding participant ${participantName} to rtkMeetingId=${currentRoom.rtkMeetingId} (meetingId=${meetingId})`,
        );
        const { token } = await createRealtimeKitParticipant({
          room: currentRoom,
          rtkMeetingId: currentRoom.rtkMeetingId!,
          participantName,
          role,
        });
        return { token };
      },
    });

    if (joinResult.status === "waiting_for_host" || joinResult.status === "waiting_for_approval") {
      console.log(
        `[room/guest-join] ${participantName} status=${joinResult.status} in meeting ${meetingId}`,
      );
      return NextResponse.json({ status: joinResult.status });
    }

    console.log(`Guest ${participantName} joined meeting: ${meetingId} as ${role}`);

    return NextResponse.json({
      status: "joined",
      token: joinResult.token,
      role,
      groupId: currentRoom.groupId,
    });
  } catch (err) {
    console.error("Failed to join meeting as guest:", err);
    return NextResponse.json(
      { error: "Failed to join meeting. Check RealtimeKit configuration." },
      { status: 502 },
    );
  }
}
