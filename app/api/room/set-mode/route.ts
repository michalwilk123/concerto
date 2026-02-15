import { type NextRequest, NextResponse } from "next/server";
import { getRoomOrFail, requireModerator } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
	const body = await request.json();
	const { roomKey, mode, participantName } = body;

	const roomOrError = getRoomOrFail(roomKey);
	if (roomOrError instanceof NextResponse) return roomOrError;
	const room = roomOrError;

	const authError = requireModerator(room, participantName);
	if (authError instanceof NextResponse) return authError;

	if (mode !== "public" && mode !== "private") {
		return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
	}

	room.mode = mode;
	console.log(`Room ${roomKey} mode set to ${mode}`);

	return NextResponse.json({ success: true, mode });
}
