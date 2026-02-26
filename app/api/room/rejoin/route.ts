import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meeting } from "@/db/schema";
import { requireGroupTeacher } from "@/lib/auth-helpers";
import { ensureMeetingFolder } from "@/lib/file-helpers";
import { rooms } from "@/lib/room-store";

export async function POST(request: NextRequest) {
	const body = await request.json();
	const { meetingId, groupId } = body;

	if (!meetingId || !groupId) {
		return NextResponse.json({ error: "meetingId and groupId are required" }, { status: 400 });
	}

	const { error, session } = await requireGroupTeacher(groupId);
	if (error) return error;

	// Verify the meeting exists and belongs to this group
	const [existingMeeting] = await db
		.select()
		.from(meeting)
		.where(eq(meeting.id, meetingId))
		.limit(1);

	if (!existingMeeting || existingMeeting.groupId !== groupId) {
		return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
	}

	// If there's already an active in-memory room for this meeting, just return its ID
	if (rooms.has(meetingId)) {
		console.log(`[room/rejoin] Meeting ${meetingId} already active, returning existing`);
		return NextResponse.json({ success: true, meetingId });
	}

	const creatorName = session?.user.name;

	// Auto-create folder hierarchy
	let meetingFolderId: string | undefined;
	try {
		meetingFolderId = await ensureMeetingFolder(groupId, creatorName || meetingId);
	} catch (err) {
		console.error("[room/rejoin] Failed to create meeting folder (non-blocking):", err);
	}

	rooms.set(meetingId, {
		groupId,
		creatorIdentity: creatorName,
		creatorUserId: session?.user.id,
		rtkMeetingId: existingMeeting.rtkMeetingId,
		meetingFolderId,
		participantIds: new Map(),
		kickedParticipants: new Set(),
	});

	console.log(`[room/rejoin] Rejoined meeting: meetingId=${meetingId}, groupId=${groupId}`);

	return NextResponse.json({ success: true, meetingId });
}
