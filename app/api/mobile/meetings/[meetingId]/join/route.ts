import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meeting } from "@/db/schema";
import {
  createRealtimeKitParticipant,
  ensureRealtimeKitMeeting,
  getOrRestoreRoom,
} from "@/lib/api-helpers";
import { requireAuth, requireGroupMember } from "@/lib/auth-helpers";
import { rooms } from "@/lib/room-store";
import { meetingRoomService } from "@/lib/services/meeting-room";
import { getSessionFromRequest } from "../../../auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  const { meetingId } = await params;
  const body = await request.json();
  const { participantName } = body;

  if (!participantName) {
    return NextResponse.json({ error: "participantName is required" }, { status: 400 });
  }

  const rawSession = await getSessionFromRequest(request);
  const { error: authError, session } = await requireAuth(rawSession);
  if (authError) return authError;

  const [meetingRow] = await db.select().from(meeting).where(eq(meeting.id, meetingId)).limit(1);
  if (!meetingRow) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  // Non-public meetings require group membership
  if (!meetingRow.isPublic) {
    const { error } = await requireGroupMember(meetingRow.groupId, session);
    if (error) return error;
  }

  const roomOrError = await getOrRestoreRoom(meetingId);
  if (roomOrError instanceof NextResponse) return roomOrError;

  let currentRoom = rooms.get(meetingId) ?? roomOrError;
  try {
    currentRoom = await ensureRealtimeKitMeeting(meetingId, "room/join");
  } catch (err) {
    console.error("[mobile/join] Failed to create RTK meeting:", err);
    return NextResponse.json(
      { error: "Failed to create meeting. Check RealtimeKit configuration." },
      { status: 502 },
    );
  }

  // Mobile always joins as student
  const role = "student" as const;

  try {
    const joinResult = await meetingRoomService.joinMeeting({
      room: currentRoom,
      participantName,
      role,
      requiresApproval: meetingRow.requiresApproval,
      userId: session.user.id,
      createParticipant: async () => {
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
      return NextResponse.json({ status: joinResult.status });
    }

    return NextResponse.json({
      status: "joined",
      token: joinResult.token,
      role,
      groupId: currentRoom.groupId,
    });
  } catch (err) {
    console.error("[mobile/join] Failed to join meeting:", err);
    return NextResponse.json(
      { error: "Failed to join meeting. Check RealtimeKit configuration." },
      { status: 502 },
    );
  }
}
