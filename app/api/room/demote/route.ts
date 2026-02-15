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

	// Authorization: admin can demote anyone, moderator can demote students
	if (!isCreator && !isModerator) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
	}

	if (targetRole === "participant") {
		// Demoting to participant — figure out what set to remove from
		if (room.moderators.has(targetIdentity) && !isCreator) {
			return NextResponse.json({ error: "Only admin can demote moderators" }, { status: 403 });
		}
		const wasInModerators = room.moderators.delete(targetIdentity);
		if (!wasInModerators) {
			room.students.delete(targetIdentity);
		}
	} else if (targetRole === "student") {
		// Demoting from moderator to student
		if (!isCreator) {
			return NextResponse.json({ error: "Only admin can demote moderators" }, { status: 403 });
		}
		room.moderators.delete(targetIdentity);
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

	console.log(`Demoted ${targetIdentity} to ${targetRole} in ${roomKey}`);

	return NextResponse.json({ success: true });
}
