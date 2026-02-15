import { NextResponse } from "next/server";
import type { Role } from "@/types/room";
import { AccessToken, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } from "./livekit";
import { type Room, rooms } from "./room-store";

/**
 * Get a room by key or return a 404 error response
 */
export function getRoomOrFail(roomKey: string): Room | NextResponse {
	const room = rooms.get(roomKey);
	if (!room) {
		return NextResponse.json({ error: "Room not found" }, { status: 404 });
	}
	return room;
}

/**
 * Check if a participant is a moderator (admin or moderator role)
 * Returns an error response if unauthorized
 */
export function requireModerator(room: Room, participantName: string): undefined | NextResponse {
	const isCreator = room.creatorIdentity === participantName;
	const isModerator = room.moderators.has(participantName);

	if (!isCreator && !isModerator) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
	}
}

/**
 * Determine the role of a participant in a room
 */
export function determineRole(room: Room, participantName: string): Role {
	const isCreator = room.creatorIdentity === participantName;
	const isModerator = room.moderators.has(participantName);
	const isStudent = room.students.has(participantName);

	if (isCreator) return "admin";
	if (isModerator) return "moderator";
	if (isStudent) return "student";
	return "participant";
}

/**
 * Create a LiveKit access token for a participant
 */
export async function createLiveKitToken(params: {
	roomKey: string;
	participantName: string;
	role: Role;
}): Promise<string> {
	const { roomKey, participantName, role } = params;

	const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
		identity: participantName,
		metadata: JSON.stringify({ role }),
	});

	token.addGrant({
		room: roomKey,
		roomJoin: true,
		canPublish: true,
		canSubscribe: true,
	});

	return await token.toJwt();
}
