import type { Room } from "@/lib/room-store";
import type { Role } from "@/types/room";

type Logger = Pick<Console, "log" | "error">;

export type JoinMeetingResult =
  | { status: "joined"; token: string }
  | { status: "waiting_for_host" }
  | { status: "waiting_for_approval" };

export type ApproveParticipantResult =
  | { status: "approved"; token: string; role: Role }
  | { status: "not_in_waiting_room" };

export type KickParticipantResult =
  | { status: "kicked"; participantId: string }
  | { status: "no_active_session" }
  | { status: "participant_not_found" };

interface MeetingRoomServiceOptions {
  teacherGracePeriodMs?: number;
  logger?: Logger;
}

export class MeetingRoomService {
  private readonly teacherGracePeriodMs: number;
  private readonly logger: Logger;

  constructor(options: MeetingRoomServiceOptions = {}) {
    this.teacherGracePeriodMs = options.teacherGracePeriodMs ?? 15_000;
    this.logger = options.logger ?? console;
  }

  async joinMeeting(params: {
    room: Room;
    participantName: string;
    role: Role;
    requiresApproval: boolean;
    userId?: string;
    createParticipant: () => Promise<{ token: string }>;
  }): Promise<JoinMeetingResult> {
    const { room, participantName, role, requiresApproval, userId, createParticipant } = params;

    if (role !== "teacher" && room.connectedTeachers.size === 0) {
      return { status: "waiting_for_host" };
    }

    if (role !== "teacher" && requiresApproval) {
      if (!room.waitingRoom.has(participantName)) {
        room.waitingRoom.set(participantName, {
          participantName,
          joinedAt: Date.now(),
          userId,
        });
      }
      return { status: "waiting_for_approval" };
    }

    const { token } = await createParticipant();
    return { status: "joined", token };
  }

  async approveWaitingParticipant(params: {
    room: Room;
    participantName: string;
    role: Role;
    createParticipant: () => Promise<{ token: string }>;
  }): Promise<ApproveParticipantResult> {
    const { room, participantName, role, createParticipant } = params;
    const waitingEntry = room.waitingRoom.get(participantName);
    if (!waitingEntry) {
      return { status: "not_in_waiting_room" };
    }

    const { token } = await createParticipant();
    room.waitingRoom.delete(participantName);
    return { status: "approved", token, role };
  }

  async kickParticipant(params: {
    room: Room;
    participantName: string;
    listParticipants: () => Promise<Array<{ id: string; name: string }>>;
    kickParticipants: (participantIds: string[]) => Promise<void>;
  }): Promise<KickParticipantResult> {
    const { room, participantName, listParticipants, kickParticipants } = params;
    if (!room.rtkMeetingId) {
      return { status: "no_active_session" };
    }

    let participantId = room.participants.get(participantName)?.rtkId;
    if (!participantId) {
      const participants = await listParticipants();
      participantId = participants.find((participant) => participant.name === participantName)?.id;
      if (!participantId) {
        return { status: "participant_not_found" };
      }
    }

    await kickParticipants([participantId]);
    room.participants.delete(participantName);
    room.connectedTeachers.delete(participantName);
    return { status: "kicked", participantId };
  }

  async endMeeting(params: {
    meetingId: string;
    room: Room;
    kickAllParticipants: () => Promise<void>;
    deleteMeetingRoom: (meetingId: string) => void;
  }): Promise<void> {
    const { meetingId, room, kickAllParticipants, deleteMeetingRoom } = params;
    if (room.allTeachersLeftTimer) {
      clearTimeout(room.allTeachersLeftTimer);
      room.allTeachersLeftTimer = undefined;
    }

    if (room.rtkMeetingId) {
      await kickAllParticipants();
    }

    deleteMeetingRoom(meetingId);
  }

  handleParticipantJoined(params: {
    room: Room;
    participantName: string;
  }): void {
    const { room, participantName } = params;
    const participant = room.participants.get(participantName);
    if (participant?.role !== "teacher") return;

    room.connectedTeachers.add(participantName);
    if (room.allTeachersLeftTimer) {
      clearTimeout(room.allTeachersLeftTimer);
      room.allTeachersLeftTimer = undefined;
    }
  }

  handleParticipantLeft(params: {
    meetingId: string;
    room: Room;
    participantName: string;
    kickAllParticipants: () => Promise<void>;
    deleteMeetingRoom: (meetingId: string) => void;
  }): void {
    const { meetingId, room, participantName, kickAllParticipants, deleteMeetingRoom } = params;

    const participant = room.participants.get(participantName);
    room.participants.delete(participantName);

    const teacherLeft = participant?.role === "teacher" || room.connectedTeachers.has(participantName);
    if (!teacherLeft) return;

    room.connectedTeachers.delete(participantName);
    if (room.connectedTeachers.size > 0) return;

    if (room.allTeachersLeftTimer) {
      clearTimeout(room.allTeachersLeftTimer);
    }

    this.logger.log(
      `[meeting-room-service] all teachers left ${meetingId}, starting ${this.teacherGracePeriodMs}ms grace`,
    );

    room.allTeachersLeftTimer = setTimeout(async () => {
      room.allTeachersLeftTimer = undefined;

      try {
        if (room.rtkMeetingId) {
          await kickAllParticipants();
        }
      } catch (error) {
        this.logger.error("[meeting-room-service] Failed to kick all participants:", error);
      } finally {
        room.waitingRoom.clear();
        room.approvedTokens.clear();
        room.rejectedParticipants.clear();
        room.participants.clear();
        deleteMeetingRoom(meetingId);
      }
    }, this.teacherGracePeriodMs);
  }
}
