import { type NextRequest, NextResponse } from "next/server";
import { createLiveKitToken, determineRole, getRoomOrFail } from "@/lib/api-helpers";
import { getSessionOrNull } from "@/lib/auth-helpers";
import { LIVEKIT_CLIENT_URL } from "@/lib/livekit";

export async function POST(request: NextRequest) {
	const body = await request.json();
	const { roomKey, participantName } = body;

	if (!roomKey || !participantName) {
		return NextResponse.json({ error: "Room key and participant name required" }, { status: 400 });
	}

	const roomOrError = getRoomOrFail(roomKey);
	if (roomOrError instanceof NextResponse) return roomOrError;
	const room = roomOrError;

	// Check if the joining user is the authenticated room creator
	const session = await getSessionOrNull();
	const isAuthenticatedCreator = session?.user?.id === room.creatorUserId;

	// Cancel any pending admin disconnect timer if creator is rejoining
	if (isAuthenticatedCreator && room.adminDisconnectTimer) {
		clearTimeout(room.adminDisconnectTimer);
		room.adminDisconnectTimer = undefined;
		console.log(`Admin disconnect timer cancelled via join for room ${roomKey}`);
	}

	const isCreator = room.creatorIdentity === participantName;
	const isModerator = room.moderators.has(participantName);
	const isStudent = room.students.has(participantName);

	if (room.mode === "private" && !isCreator && !isModerator && !isStudent) {
		const requestId = `${participantName}-${Date.now()}`;
		room.waitingRoom.set(requestId, {
			name: participantName,
			timestamp: Date.now(),
		});
		console.log(`${participantName} added to waiting room for ${roomKey}`);
		return NextResponse.json({ status: "waiting", requestId });
	}

	const role = determineRole(room, participantName);
	const jwt = await createLiveKitToken({ roomKey, participantName, role });

	console.log(`Participant ${participantName} joined room: ${roomKey} as ${role}`);

	return NextResponse.json({ token: jwt, livekitUrl: LIVEKIT_CLIENT_URL, role });
}
