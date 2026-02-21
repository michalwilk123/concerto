import { type NextRequest, NextResponse } from "next/server";
import { getRoomOrFail } from "@/lib/api-helpers";
import { requireGroupTeacher } from "@/lib/auth-helpers";
import { removeParticipant } from "@/lib/realtimekit";

export async function POST(request: NextRequest) {
	const body = await request.json();
	const { meetingId, targetIdentity } = body;

	const roomOrError = getRoomOrFail(meetingId);
	if (roomOrError instanceof NextResponse) return roomOrError;
	const room = roomOrError;

	// Require group teacher to kick
	const { error } = await requireGroupTeacher(room.groupId);
	if (error) return error;

	if (targetIdentity === room.creatorIdentity) {
		return NextResponse.json({ error: "Cannot kick room creator" }, { status: 403 });
	}

	const participantId = room.participantIds.get(targetIdentity);
	if (!participantId) {
		return NextResponse.json({ error: "Participant not found" }, { status: 404 });
	}

	if (!room.rtkMeetingId) {
		return NextResponse.json({ error: "No active RTK session" }, { status: 400 });
	}

	try {
		await removeParticipant(room.rtkMeetingId, participantId);
		room.participantIds.delete(targetIdentity);
		console.log(`Kicked ${targetIdentity} from meeting ${meetingId}`);
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Failed to kick participant:", error);
		return NextResponse.json({ error: "Failed to kick participant" }, { status: 500 });
	}
}
