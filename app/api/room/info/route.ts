import { type NextRequest, NextResponse } from "next/server";
import { determineRole, getRoomOrFail } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
	const body = await request.json();
	const { roomKey, participantName } = body;

	const roomOrError = getRoomOrFail(roomKey);
	if (roomOrError instanceof NextResponse) return roomOrError;
	const room = roomOrError;

	const role = determineRole(room, participantName);

	return NextResponse.json({
		mode: room.mode,
		role,
		creatorIdentity: room.creatorIdentity,
	});
}
