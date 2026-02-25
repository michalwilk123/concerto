import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { groupMember, meeting } from "@/db/schema";
import type { Role } from "@/types/room";
import { addParticipant, roleToPreset } from "./realtimekit";
import { type Room, rooms } from "./room-store";

/**
 * Get a room by meeting ID, restoring it from the DB if not in memory.
 * Returns a 404 NextResponse if the meeting doesn't exist in the DB either.
 */
export async function getOrRestoreRoom(meetingId: string): Promise<Room | NextResponse> {
	const room = rooms.get(meetingId);
	if (room) return room;

	// Not in memory — try to restore from DB
	const [meetingRow] = await db
		.select()
		.from(meeting)
		.where(eq(meeting.id, meetingId))
		.limit(1);

	if (!meetingRow) {
		return NextResponse.json({ error: "Room not found" }, { status: 404 });
	}

	const restoredRoom: Room = {
		groupId: meetingRow.groupId,
		creatorIdentity: "",
		creatorUserId: "",
		rtkMeetingId: meetingRow.rtkMeetingId,
		participantIds: new Map(),
	};
	rooms.set(meetingId, restoredRoom);
	console.log(
		`[getOrRestoreRoom] Restored room ${meetingId} from DB (rtkMeetingId=${meetingRow.rtkMeetingId})`,
	);
	return restoredRoom;
}

/**
 * @deprecated Use getOrRestoreRoom instead — this will 404 after server restart.
 */
export function getRoomOrFail(meetingId: string): Room | NextResponse {
	const room = rooms.get(meetingId);
	if (!room) {
		return NextResponse.json({ error: "Room not found" }, { status: 404 });
	}
	return room;
}

/**
 * Determine the role of a user in a group. Returns "teacher" for admins and group teachers.
 */
export async function determineRole(
	groupId: string,
	userId: string,
	userRole?: string | null,
): Promise<Role> {
	if (userRole === "admin") return "teacher";

	const [member] = await db
		.select()
		.from(groupMember)
		.where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, userId)))
		.limit(1);

	if (member?.role === "teacher") return "teacher";
	return "student";
}

/**
 * Create a RealtimeKit participant and store the participant ID mapping
 */
export async function createRealtimeKitParticipant(params: {
	room: Room;
	rtkMeetingId: string;
	participantName: string;
	role: Role;
}): Promise<{ token: string; participantId: string }> {
	const { room, rtkMeetingId, participantName, role } = params;
	const preset = roleToPreset(role);
	const { id, token } = await addParticipant(rtkMeetingId, participantName, preset);
	room.participantIds.set(participantName, id);
	return { token, participantId: id };
}
