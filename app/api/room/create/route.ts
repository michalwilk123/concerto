import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { generateRoomKey, rooms } from "@/lib/room-store";

export async function POST(request: NextRequest) {
	const { error, session } = await requireAdmin();
	if (error) return error;

	const body = await request.json();
	const { displayName } = body;
	const creatorName = displayName || session?.user.name;

	let roomKey = generateRoomKey();
	while (rooms.has(roomKey)) {
		roomKey = generateRoomKey();
	}

	rooms.set(roomKey, {
		mode: "public",
		creatorIdentity: creatorName,
		creatorUserId: session?.user.id,
		moderators: new Set(),
		students: new Set(),
		waitingRoom: new Map(),
		approvedTokens: new Map(),
	});
	console.log(`Room created: ${roomKey} by ${creatorName} (user: ${session?.user.id})`);

	return NextResponse.json({ success: true, roomKey });
}
