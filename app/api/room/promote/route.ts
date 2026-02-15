import { type NextRequest, NextResponse } from "next/server";
import { getRoomOrFail } from "@/lib/api-helpers";
import { roomService } from "@/lib/livekit";

export async function POST(request: NextRequest) {
	const body = await request.json();
	const { roomKey, targetIdentity, participantName, targetRole } = body;

	const roomOrError = getRoomOrFail(roomKey);
	if (roomOrError instanceof NextResponse) return roomOrError;
	const room = roomOrError;

	const isCreator = room.creatorIdentity === participantName;
	const isModerator = room.moderators.has(participantName);

	if (targetRole === "moderator") {
		// Only admin (creator) can promote to moderator
		if (!isCreator) {
			return NextResponse.json({ error: "Only admin can promote to moderator" }, { status: 403 });
		}
		// Remove from students if they were a student
		room.students.delete(targetIdentity);
		room.moderators.add(targetIdentity);
	} else if (targetRole === "student") {
		// Admin or moderator can promote to student
		if (!isCreator && !isModerator) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
		}
		room.students.add(targetIdentity);
	} else {
		return NextResponse.json({ error: "Invalid target role" }, { status: 400 });
	}

	try {
		await roomService.updateParticipant(roomKey, targetIdentity, {
			metadata: JSON.stringify({ role: targetRole }),
		});
	} catch (error) {
		console.error("Failed to update participant metadata:", error);
	}

	console.log(`Promoted ${targetIdentity} to ${targetRole} in ${roomKey}`);

	return NextResponse.json({ success: true });
}
