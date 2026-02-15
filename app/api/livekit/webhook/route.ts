import { type NextRequest, NextResponse } from "next/server";
import { roomService, webhookReceiver } from "@/lib/livekit";
import { rooms } from "@/lib/room-store";

const ADMIN_GRACE_PERIOD_MS = 10_000;

export async function POST(request: NextRequest) {
	try {
		const body = await request.text();
		const authHeader = request.headers.get("Authorization") ?? "";
		const event = await webhookReceiver.receive(body, authHeader);

		if (event.event === "room_finished" && event.room?.name) {
			const roomName = event.room.name;
			const room = rooms.get(roomName);
			if (room?.adminDisconnectTimer) {
				clearTimeout(room.adminDisconnectTimer);
				room.adminDisconnectTimer = undefined;
			}
			if (rooms.delete(roomName)) {
				console.log(`Room deleted (empty): ${roomName}`);
			}
		}

		// Admin disconnected — start grace period before cleanup
		if (event.event === "participant_left" && event.participant && event.room?.name) {
			const roomName = event.room.name;
			const identity = event.participant.identity;
			const room = rooms.get(roomName);

			if (room && room.creatorIdentity === identity) {
				console.log(
					`Admin ${identity} left room ${roomName}, starting ${ADMIN_GRACE_PERIOD_MS / 1000}s grace period...`,
				);

				// Clear any existing timer first
				if (room.adminDisconnectTimer) {
					clearTimeout(room.adminDisconnectTimer);
				}

				room.adminDisconnectTimer = setTimeout(async () => {
					room.adminDisconnectTimer = undefined;
					console.log(`Grace period expired for room ${roomName}, cleaning up...`);

					const participants = await roomService.listParticipants(roomName).catch(() => []);
					for (const p of participants) {
						await roomService.removeParticipant(roomName, p.identity).catch(() => {});
					}
					await roomService.deleteRoom(roomName).catch(() => {});
					rooms.delete(roomName);

					console.log(`Room ${roomName} cleaned up after admin disconnect`);
				}, ADMIN_GRACE_PERIOD_MS);
			}
		}

		// Admin reconnected — cancel grace period
		if (event.event === "participant_joined" && event.participant && event.room?.name) {
			const roomName = event.room.name;
			const identity = event.participant.identity;
			const room = rooms.get(roomName);

			if (room && room.creatorIdentity === identity && room.adminDisconnectTimer) {
				clearTimeout(room.adminDisconnectTimer);
				room.adminDisconnectTimer = undefined;
				console.log(`Admin ${identity} reconnected to room ${roomName}, grace period cancelled`);
			}
		}
	} catch (err) {
		console.error("Webhook error:", err);
	}
	return new NextResponse(null, { status: 200 });
}
