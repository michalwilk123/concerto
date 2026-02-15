import { type NextRequest, NextResponse } from "next/server";
import { getRoomOrFail, requireModerator } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
	const body = await request.json();
	const { roomKey, participantName } = body;

	const roomOrError = getRoomOrFail(roomKey);
	if (roomOrError instanceof NextResponse) return roomOrError;
	const room = roomOrError;

	const authError = requireModerator(room, participantName);
	if (authError instanceof NextResponse) return authError;

	const waitingList = Array.from(room.waitingRoom.entries()).map(([id, data]) => ({
		requestId: id,
		name: data.name,
		timestamp: data.timestamp,
	}));

	return NextResponse.json({ waitingList });
}
