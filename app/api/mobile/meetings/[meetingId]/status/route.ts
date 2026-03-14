import { type NextRequest, NextResponse } from "next/server";
import { getOrRestoreRoom } from "@/lib/api-helpers";
import { rooms } from "@/lib/room-store";
import { requireAuth } from "@/lib/auth-helpers";
import { getSessionFromRequest } from "../../../auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  const { meetingId } = await params;
  const body = await request.json();
  const { participantName } = body;

  if (!participantName) {
    return NextResponse.json(
      { error: "participantName is required" },
      { status: 400 },
    );
  }

  const rawSession = await getSessionFromRequest(request);
  const { error: authError } = await requireAuth(rawSession);
  if (authError) return authError;

  const roomOrError = await getOrRestoreRoom(meetingId);
  if (roomOrError instanceof NextResponse) return roomOrError;

  const currentRoom = rooms.get(meetingId) ?? roomOrError;

  // Rejected
  if (currentRoom.rejectedParticipants.has(participantName)) {
    return NextResponse.json({ status: "rejected" });
  }

  // Approved — consume token
  const approvedData = currentRoom.approvedTokens.get(participantName);
  if (approvedData) {
    currentRoom.approvedTokens.delete(participantName);
    return NextResponse.json({
      status: "approved",
      token: approvedData.token,
      role: approvedData.role,
      groupId: approvedData.groupId,
    });
  }

  // Still in waiting room
  if (currentRoom.waitingRoom.has(participantName)) {
    return NextResponse.json({ status: "waiting_for_approval" });
  }

  // Not in waiting room — check if host is present
  if (currentRoom.connectedTeachers.size > 0) {
    return NextResponse.json({ status: "host_present" });
  }

  return NextResponse.json({ status: "waiting_for_host" });
}
