export interface Room {
	groupId: string;
	creatorIdentity: string;
	creatorUserId: string;
	rtkMeetingId: string | null;
	meetingFolderId?: string;
	participantIds: Map<string, string>;
	adminDisconnectTimer?: ReturnType<typeof setTimeout>;
}

// Use globalThis to survive Next.js dev hot-reloads
const globalRooms = globalThis as unknown as {
	__rooms?: Map<string, Room>;
};
if (!globalRooms.__rooms) {
	globalRooms.__rooms = new Map<string, Room>();
}

export const rooms = globalRooms.__rooms;
