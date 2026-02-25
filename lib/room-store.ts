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
	__rtkCreationLocks?: Map<string, Promise<string>>;
};
if (!globalRooms.__rooms) {
	globalRooms.__rooms = new Map<string, Room>();
}
if (!globalRooms.__rtkCreationLocks) {
	globalRooms.__rtkCreationLocks = new Map<string, Promise<string>>();
}

export const rooms = globalRooms.__rooms;
// Per-meeting locks to prevent duplicate RTK meeting creation on concurrent joins
export const rtkCreationLocks = globalRooms.__rtkCreationLocks;
