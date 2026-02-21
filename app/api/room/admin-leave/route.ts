import { type NextRequest, NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/auth-helpers";
import { removeParticipant } from "@/lib/realtimekit";
import { rooms } from "@/lib/room-store";

export async function POST(request: NextRequest) {
	const session = await getSessionOrNull();
	if (!session) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	const { meetingId } = await request.json();
	if (!meetingId) {
		return NextResponse.json({ error: "Meeting ID required" }, { status: 400 });
	}

	const room = rooms.get(meetingId);
	if (!room) {
		return NextResponse.json({ error: "Room not found" }, { status: 404 });
	}

	if (room.creatorUserId !== session.user.id) {
		return NextResponse.json({ error: "Not the room creator" }, { status: 403 });
	}

	// Kick all participants via RealtimeKit
	if (room.rtkMeetingId) {
		for (const [, participantId] of room.participantIds) {
			await removeParticipant(room.rtkMeetingId, participantId).catch(() => {});
		}
	}

	// Remove from in-memory store
	rooms.delete(meetingId);

	console.log(`[admin-leave] Creator left meeting ${meetingId}, rtkMeetingId=${room.rtkMeetingId}, room deleted`);

	return NextResponse.json({ success: true });
}
