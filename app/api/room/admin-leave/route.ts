import { type NextRequest, NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/auth-helpers";
import { roomService } from "@/lib/livekit";
import { rooms } from "@/lib/room-store";

export async function POST(request: NextRequest) {
	const session = await getSessionOrNull();
	if (!session) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	const { roomKey } = await request.json();
	if (!roomKey) {
		return NextResponse.json({ error: "Room key required" }, { status: 400 });
	}

	const room = rooms.get(roomKey);
	if (!room) {
		return NextResponse.json({ error: "Room not found" }, { status: 404 });
	}

	if (room.creatorUserId !== session.user.id) {
		return NextResponse.json({ error: "Not the room creator" }, { status: 403 });
	}

	// Kick all participants
	const participants = await roomService.listParticipants(roomKey).catch(() => []);
	for (const p of participants) {
		await roomService.removeParticipant(roomKey, p.identity).catch(() => {});
	}

	// Delete LiveKit room
	await roomService.deleteRoom(roomKey).catch(() => {});

	// Remove from in-memory store
	rooms.delete(roomKey);

	console.log(`Admin left room ${roomKey}, all participants kicked and room deleted`);

	return NextResponse.json({ success: true });
}
