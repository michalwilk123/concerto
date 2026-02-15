import { type NextRequest, NextResponse } from "next/server";
import { getRoomOrFail, requireModerator } from "@/lib/api-helpers";
import { roomService } from "@/lib/livekit";

export async function POST(request: NextRequest) {
	const body = await request.json();
	const { roomKey, targetIdentity, participantName } = body;

	const roomOrError = getRoomOrFail(roomKey);
	if (roomOrError instanceof NextResponse) return roomOrError;
	const room = roomOrError;

	const authError = requireModerator(room, participantName);
	if (authError instanceof NextResponse) return authError;

	if (targetIdentity === room.creatorIdentity) {
		return NextResponse.json({ error: "Cannot kick room creator" }, { status: 403 });
	}

	try {
		await roomService.removeParticipant(roomKey, targetIdentity);
		console.log(`Kicked ${targetIdentity} from ${roomKey}`);
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Failed to kick participant:", error);
		return NextResponse.json({ error: "Failed to kick participant" }, { status: 500 });
	}
}
