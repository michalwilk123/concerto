import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meeting } from "@/db/schema";
import {
  createRealtimeKitParticipant,
  determineRole,
  ensureRealtimeKitMeeting,
  getOrRestoreRoom,
} from "@/lib/api-helpers";
import { requireAuth, requireGroupMember } from "@/lib/auth-helpers";
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

  // Check if the meeting is public — public meetings allow any authenticated user
  const [meetingRow] = await db.select().from(meeting).where(eq(meeting.id, meetingId)).limit(1);
  const isPublicMeeting = meetingRow?.isPublic === true;

  const authResult = isPublicMeeting ? await requireAuth() : await requireGroupMember(room.groupId);
  if (authResult.error) return authResult.error;
  const session = authResult.session!;

  let currentRoom = rooms.get(meetingId) ?? room;
  try {
    currentRoom = await ensureRealtimeKitMeeting(meetingId, "room/join");
  } catch (err) {
    console.error("Failed to create RTK meeting:", err);
    return NextResponse.json(
      { error: "Failed to create meeting. Check RealtimeKit configuration." },
      { status: 502 },
    );
  }

  // Derive role from group membership
  const role = await determineRole(currentRoom.groupId, session.user.id, session.user.role);

  try {
    const joinResult = await meetingRoomService.joinMeeting({
      room: currentRoom,
      participantName,
      role,
      requiresApproval: meetingRow?.requiresApproval === true,
      userId: session.user.id,
      createParticipant: async () => {
        console.log(
          `[room/join] Adding participant ${participantName} to rtkMeetingId=${currentRoom.rtkMeetingId} (meetingId=${meetingId})`,
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
      console.log(`[room/join] ${participantName} status=${joinResult.status} in meeting ${meetingId}`);
      return NextResponse.json({ status: joinResult.status });
    }

    console.log(`Participant ${participantName} joined meeting: ${meetingId} as ${role}`);

    return NextResponse.json({
      status: "joined",
      token: joinResult.token,
      role,
      groupId: currentRoom.groupId,
    });
  } catch (err) {
    console.error("Failed to join meeting:", err);
    return NextResponse.json(
      { error: "Failed to join meeting. Check RealtimeKit configuration." },
      { status: 502 },
    );
  }
}
