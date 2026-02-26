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
	__roomRestoreLocks?: Map<string, Promise<Room | import("next/server").NextResponse>>;
};
if (!globalRooms.__rooms) {
	globalRooms.__rooms = new Map<string, Room>();
}
if (!globalRooms.__rtkCreationLocks) {
	globalRooms.__rtkCreationLocks = new Map<string, Promise<string>>();
}
if (!globalRooms.__roomRestoreLocks) {
	globalRooms.__roomRestoreLocks = new Map<
		string,
		Promise<Room | import("next/server").NextResponse>
	>();
}

export const rooms = globalRooms.__rooms;
// Per-meeting locks to prevent duplicate RTK meeting creation on concurrent joins
export const rtkCreationLocks = globalRooms.__rtkCreationLocks;
// Per-meeting locks to prevent duplicate Room object creation on concurrent restores
export const roomRestoreLocks = globalRooms.__roomRestoreLocks;
