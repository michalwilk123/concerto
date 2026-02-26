import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meeting, meetingSession } from "@/db/schema";
import { createRealtimeKitParticipant, getOrRestoreRoom } from "@/lib/api-helpers";
import { createMeeting } from "@/lib/realtimekit";
import { rooms, rtkCreationLocks } from "@/lib/room-store";

export async function POST(request: NextRequest) {
	const body = await request.json();
	const { meetingId, participantName } = body;

	if (!meetingId || !participantName) {
		return NextResponse.json(
			{ error: "Meeting ID and participant name required" },
			{ status: 400 },
		);
	}

	const roomOrError = await getOrRestoreRoom(meetingId);
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

	// Lazily create RTK meeting if not yet created (with lock to prevent race conditions)
	if (!room.rtkMeetingId) {
		let pending = rtkCreationLocks.get(meetingId);
		if (!pending) {
			console.log(`[room/guest-join] Creating RTK meeting for meetingId=${meetingId}`);
			pending = (async () => {
				const rtkId = await createMeeting();
				// Always update the canonical Room in the Map, not the captured reference
				const currentRoom = rooms.get(meetingId);
				if (!currentRoom) throw new Error("Room disappeared during RTK creation");
				currentRoom.rtkMeetingId = rtkId;
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
				return rtkId;
			})();
			rtkCreationLocks.set(meetingId, pending);
			pending.finally(() => rtkCreationLocks.delete(meetingId));
		} else {
			console.log(
				`[room/guest-join] Reusing concurrent RTK creation lock for meetingId=${meetingId}`,
			);
		}
		try {
			await pending;
		} catch (err) {
			console.error("Failed to create RTK meeting:", err);
			return NextResponse.json(
				{ error: "Failed to create meeting. Check RealtimeKit configuration." },
				{ status: 502 },
			);
		}
	}

	// Use the canonical room from the Map for participant creation
	const currentRoom = rooms.get(meetingId) ?? room;

	if (!currentRoom.rtkMeetingId) {
		return NextResponse.json({ error: "Failed to create meeting" }, { status: 502 });
	}

	const role = "student" as const;
	console.log(
		`[room/guest-join] Adding participant ${participantName} to rtkMeetingId=${currentRoom.rtkMeetingId} (meetingId=${meetingId})`,
	);

	try {
		const { token } = await createRealtimeKitParticipant({
			room: currentRoom,
			rtkMeetingId: currentRoom.rtkMeetingId!,
			participantName,
			role,
		});

		console.log(`Guest ${participantName} joined meeting: ${meetingId} as ${role}`);

		return NextResponse.json({
			token,
			role,
			groupId: currentRoom.groupId,
			meetingFolderId: currentRoom.meetingFolderId,
		});
	} catch (err) {
		console.error("Failed to join meeting as guest:", err);
		return NextResponse.json(
			{ error: "Failed to join meeting. Check RealtimeKit configuration." },
			{ status: 502 },
		);
	}
}
