import { type NextRequest, NextResponse } from "next/server";
import { removeParticipant } from "@/lib/realtimekit";
import { rooms } from "@/lib/room-store";

const ADMIN_GRACE_PERIOD_MS = 10_000;

/** Find the DB meeting ID for a given RTK meeting ID by scanning rooms */
function findMeetingIdByRtkId(rtkMeetingId: string): string | undefined {
	for (const [meetingId, room] of rooms) {
		if (room.rtkMeetingId === rtkMeetingId) return meetingId;
	}
	return undefined;
}

export async function POST(request: NextRequest) {
	try {
		const event = await request.json();
		console.log(
			`[webhook] Received event: ${event.event}, rtkMeetingId: ${event.meeting?.id ?? "NONE"}`,
		);

		const rtkMeetingId = event.meeting?.id;
		if (!rtkMeetingId) {
			return new NextResponse(null, { status: 200 });
		}

		const meetingId = findMeetingIdByRtkId(rtkMeetingId);
		if (!meetingId) {
			return new NextResponse(null, { status: 200 });
		}

		const room = rooms.get(meetingId);
		if (!room) {
			return new NextResponse(null, { status: 200 });
		}

		if (event.event === "meeting.participantLeft") {
			const participantName = event.participant?.name;

			if (participantName && room.creatorIdentity === participantName) {
				console.log(
					`Creator ${participantName} left meeting ${meetingId}, starting ${ADMIN_GRACE_PERIOD_MS / 1000}s grace period...`,
				);

				if (room.adminDisconnectTimer) {
					clearTimeout(room.adminDisconnectTimer);
				}

				room.adminDisconnectTimer = setTimeout(async () => {
					room.adminDisconnectTimer = undefined;
					console.log(`Grace period expired for meeting ${meetingId}, cleaning up...`);

					if (room.rtkMeetingId) {
						for (const [, pid] of room.participantIds) {
							await removeParticipant(room.rtkMeetingId, pid).catch(() => {});
						}
					}
					rooms.delete(meetingId);

					console.log(`Meeting ${meetingId} cleaned up after creator disconnect`);
				}, ADMIN_GRACE_PERIOD_MS);
			}
		}

		if (event.event === "meeting.participantJoined") {
			const participantName = event.participant?.name;

			if (
				participantName &&
				room.creatorIdentity === participantName &&
				room.adminDisconnectTimer
			) {
				clearTimeout(room.adminDisconnectTimer);
				room.adminDisconnectTimer = undefined;
				console.log(
					`Creator ${participantName} reconnected to meeting ${meetingId}, grace period cancelled`,
				);
			}
		}
	} catch (err) {
		console.error("Webhook error:", err);
	}
	return new NextResponse(null, { status: 200 });
}
