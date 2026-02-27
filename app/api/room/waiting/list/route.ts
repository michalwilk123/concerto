import { type NextRequest, NextResponse } from "next/server";
import { getOrRestoreRoom } from "@/lib/api-helpers";
import { requireGroupTeacher } from "@/lib/auth-helpers";
import { rooms } from "@/lib/room-store";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const meetingId = searchParams.get("meetingId");

  if (!meetingId) {
    return NextResponse.json({ error: "meetingId required" }, { status: 400 });
  }

  const roomOrError = await getOrRestoreRoom(meetingId);
  if (roomOrError instanceof NextResponse) return roomOrError;

  const currentRoom = rooms.get(meetingId) ?? roomOrError;

  const { error } = await requireGroupTeacher(currentRoom.groupId);
  if (error) return error;

  const waiting = Array.from(currentRoom.waitingRoom.values()).map((entry) => ({
    participantName: entry.participantName,
    joinedAt: entry.joinedAt,
  }));

  return NextResponse.json({ waiting });
}
