export interface Room {
	mode: "public" | "private";
	creatorIdentity: string;
	creatorUserId: string;
	moderators: Set<string>;
	students: Set<string>;
	waitingRoom: Map<string, { name: string; timestamp: number }>;
	approvedTokens: Map<string, { token: string; livekitUrl: string }>;
	adminDisconnectTimer?: ReturnType<typeof setTimeout>;
}

// Use globalThis to survive Next.js dev hot-reloads
const globalRooms = globalThis as unknown as { __rooms?: Map<string, Room> };
if (!globalRooms.__rooms) {
	globalRooms.__rooms = new Map<string, Room>();
}

export const rooms = globalRooms.__rooms;

export function generateRoomKey(): string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	let key = "";
	for (let i = 0; i < 6; i++) {
		key += chars[Math.floor(Math.random() * chars.length)];
	}
	return `${key.slice(0, 3)}-${key.slice(3)}`;
}
