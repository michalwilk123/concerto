import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meeting, meetingSession } from "@/db/schema";
import { createRealtimeKitParticipant, getRoomOrFail } from "@/lib/api-helpers";
import { createMeeting } from "@/lib/realtimekit";

export async function POST(request: NextRequest) {
	const body = await request.json();
	const { meetingId, participantName } = body;

	if (!meetingId || !participantName) {
		return NextResponse.json(
			{ error: "Meeting ID and participant name required" },
			{ status: 400 },
		);
	}

	const roomOrError = getRoomOrFail(meetingId);
	if (roomOrError instanceof NextResponse) return roomOrError;
	const room = roomOrError;

	// Block guests from private meetings
	const [meetingRow] = await db.select().from(meeting).where(eq(meeting.id, meetingId)).limit(1);
	if (meetingRow && !meetingRow.isPublic) {
		return NextResponse.json(
			{ error: "This meeting is private. You need to be a group member to join." },
			{ status: 403 },
		);
	}

	// Lazily create RTK meeting if not yet created
	if (!room.rtkMeetingId) {
		try {
			const rtkId = await createMeeting();
			room.rtkMeetingId = rtkId;
			await db
				.insert(meetingSession)
				.values({ id: rtkId, meetingId })
				.catch((err) => {
					console.error("[room/guest-join] Failed to persist meeting session:", err);
				});
			await db
				.update(meeting)
				.set({ rtkMeetingId: rtkId })
				.where(eq(meeting.id, meetingId))
				.catch((err) => {
					console.error("[room/guest-join] Failed to update meeting rtkMeetingId:", err);
				});
			console.log(
				`[room/guest-join] Lazily created RTK meeting: rtkMeetingId=${rtkId} for meetingId=${meetingId}`,
			);
		} catch (err) {
			console.error("Failed to create RTK meeting:", err);
			return NextResponse.json(
				{ error: "Failed to create meeting. Check RealtimeKit configuration." },
				{ status: 502 },
			);
		}
	}

	const role = "student" as const;

	try {
		const { token } = await createRealtimeKitParticipant({
			room,
			rtkMeetingId: room.rtkMeetingId,
			participantName,
			role,
		});

		console.log(`Guest ${participantName} joined meeting: ${meetingId} as ${role}`);

		return NextResponse.json({
			token,
			role,
			groupId: room.groupId,
			meetingFolderId: room.meetingFolderId,
		});
	} catch (err) {
		console.error("Failed to join meeting as guest:", err);
		return NextResponse.json(
			{ error: "Failed to join meeting. Check RealtimeKit configuration." },
			{ status: 502 },
		);
	}
}
