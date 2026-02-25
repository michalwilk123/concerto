import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meeting, meetingSession } from "@/db/schema";
import { createRealtimeKitParticipant, determineRole, getOrRestoreRoom } from "@/lib/api-helpers";
import { requireAuth, requireGroupMember } from "@/lib/auth-helpers";
import { createMeeting } from "@/lib/realtimekit";
import { rtkCreationLocks } from "@/lib/room-store";

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

	// Check if the meeting is public — public meetings allow any authenticated user
	const [meetingRow] = await db.select().from(meeting).where(eq(meeting.id, meetingId)).limit(1);
	const isPublicMeeting = meetingRow?.isPublic === true;

	const authResult = isPublicMeeting
		? await requireAuth()
		: await requireGroupMember(room.groupId);
	if (authResult.error) return authResult.error;
	const session = authResult.session!;

	// Cancel any pending creator disconnect timer if creator is rejoining
	const isAuthenticatedCreator = session?.user?.id === room.creatorUserId;
	if (isAuthenticatedCreator && room.adminDisconnectTimer) {
		clearTimeout(room.adminDisconnectTimer);
		room.adminDisconnectTimer = undefined;
		console.log(`Creator disconnect timer cancelled via join for meeting ${meetingId}`);
	}

	// Lazily create RTK meeting if not yet created (with lock to prevent race conditions)
	if (!room.rtkMeetingId) {
		let pending = rtkCreationLocks.get(meetingId);
		if (!pending) {
			pending = (async () => {
				const rtkId = await createMeeting();
				room.rtkMeetingId = rtkId;
				await db
					.insert(meetingSession)
					.values({ id: rtkId, meetingId })
					.catch((err) => {
						console.error("[room/join] Failed to persist meeting session:", err);
					});
				await db
					.update(meeting)
					.set({ rtkMeetingId: rtkId })
					.where(eq(meeting.id, meetingId))
					.catch((err) => {
						console.error("[room/join] Failed to update meeting rtkMeetingId:", err);
					});
				console.log(
					`[room/join] Lazily created RTK meeting: rtkMeetingId=${rtkId} for meetingId=${meetingId}`,
				);
				return rtkId;
			})();
			rtkCreationLocks.set(meetingId, pending);
			pending.finally(() => rtkCreationLocks.delete(meetingId));
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

	// Derive role from group membership
	const role = await determineRole(room.groupId, session.user.id, session.user.role);

	try {
		const { token } = await createRealtimeKitParticipant({
			room,
			rtkMeetingId: room.rtkMeetingId,
			participantName,
			role,
		});

		console.log(`Participant ${participantName} joined meeting: ${meetingId} as ${role}`);

		return NextResponse.json({
			token,
			role,
			groupId: room.groupId,
			meetingFolderId: room.meetingFolderId,
		});
	} catch (err) {
		console.error("Failed to join meeting:", err);
		return NextResponse.json(
			{ error: "Failed to join meeting. Check RealtimeKit configuration." },
			{ status: 502 },
		);
	}
}
