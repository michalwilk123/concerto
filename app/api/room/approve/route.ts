import { type NextRequest, NextResponse } from "next/server";
import { createLiveKitToken, getRoomOrFail, requireModerator } from "@/lib/api-helpers";
import { LIVEKIT_CLIENT_URL } from "@/lib/livekit";

export async function POST(request: NextRequest) {
	const body = await request.json();
	const { roomKey, requestId, participantName } = body;

	const roomOrError = getRoomOrFail(roomKey);
	if (roomOrError instanceof NextResponse) return roomOrError;
	const room = roomOrError;

	const authError = requireModerator(room, participantName);
	if (authError instanceof NextResponse) return authError;

	const waitingParticipant = room.waitingRoom.get(requestId);
	if (!waitingParticipant) {
		return NextResponse.json({ error: "Request not found" }, { status: 404 });
	}

	room.waitingRoom.delete(requestId);

	const jwt = await createLiveKitToken({
		roomKey,
		participantName: waitingParticipant.name,
		role: "participant",
	});

	room.approvedTokens.set(requestId, {
		token: jwt,
		livekitUrl: LIVEKIT_CLIENT_URL,
	});

	console.log(`Approved ${waitingParticipant.name} to join ${roomKey}`);

	return NextResponse.json({ success: true });
}
