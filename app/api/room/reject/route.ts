import { type NextRequest, NextResponse } from "next/server";
import { getRoomOrFail, requireModerator } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
	const body = await request.json();
	const { roomKey, requestId, participantName } = body;

	const roomOrError = getRoomOrFail(roomKey);
	if (roomOrError instanceof NextResponse) return roomOrError;
	const room = roomOrError;

	const authError = requireModerator(room, participantName);
	if (authError instanceof NextResponse) return authError;

	room.waitingRoom.delete(requestId);
	console.log(`Rejected request ${requestId} for ${roomKey}`);

	return NextResponse.json({ success: true });
}
