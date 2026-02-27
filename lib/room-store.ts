import type { Role } from "@/types/room";

export interface Room {
  groupId: string;
  rtkMeetingId: string | null;
  meetingFolderId?: string;
  // participantName -> { rtkId, customParticipantId, role }
  participants: Map<string, { rtkId: string; customParticipantId: string; role: Role }>;
  // teacher names currently connected (confirmed by webhook)
  connectedTeachers: Set<string>;
  // grace period timer when all teachers leave
  allTeachersLeftTimer?: ReturnType<typeof setTimeout>;
  // waiting room queue: participantName -> metadata
  waitingRoom: Map<string, { participantName: string; joinedAt: number; userId?: string }>;
  // approved but not yet picked up by polling: name -> join data
  approvedTokens: Map<
    string,
    { token: string; role: Role; groupId: string; meetingFolderId?: string }
  >;
  // rejected participants (for current session)
  rejectedParticipants: Set<string>;
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
