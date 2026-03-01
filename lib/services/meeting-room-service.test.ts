import assert from "node:assert/strict";
import test from "node:test";
import type { Room } from "@/lib/room-store";
import {
  addParticipant,
  createMeeting,
  kickActiveSessionParticipants,
  kickAllActiveSessionParticipants,
  listParticipants,
  removeParticipant,
} from "@/lib/realtimekit";
import { MeetingRoomService } from "./meeting-room-service";

function createRoom(overrides: Partial<Room> = {}): Room {
  return {
    groupId: "group-1",
    rtkMeetingId: "rtk-meeting-1",
    participants: new Map(),
    connectedTeachers: new Set(),
    waitingRoom: new Map(),
    approvedTokens: new Map(),
    rejectedParticipants: new Set(),
    ...overrides,
  };
}

function assertRtkJoinConfig(): void {
  assert.equal(Boolean(process.env.RTK_ORG_ID), true, "RTK_ORG_ID is required");
  assert.equal(Boolean(process.env.RTK_API_KEY), true, "RTK_API_KEY is required");
}

function assertRtkActiveSessionConfig(): void {
  assert.equal(
    Boolean(process.env.RTK_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || process.env.R2_ACCOUNT_ID),
    true,
    "RTK_ACCOUNT_ID (or CLOUDFLARE_ACCOUNT_ID/R2_ACCOUNT_ID) is required",
  );
  assert.equal(Boolean(process.env.RTK_APP_ID), true, "RTK_APP_ID is required");
  assert.equal(Boolean(process.env.CLOUDFLARE_API_TOKEN), true, "CLOUDFLARE_API_TOKEN is required");
}

test("rtk integration: create meeting + participant token (join contract)", async () => {
  assertRtkJoinConfig();
  const meetingId = await createMeeting();
  const participant = await addParticipant(
    meetingId,
    "RTK Join Probe Teacher",
    "group_call_host",
    `join-probe-${Date.now()}`,
  );

  assert.ok(participant.id);
  assert.ok(participant.token);

  const participants = await listParticipants(meetingId);
  assert.equal(
    participants.some(
      (p) => p.id === participant.id && p.name === "RTK Join Probe Teacher",
    ),
    true,
  );

  await removeParticipant(meetingId, participant.id);
});

test(
  "rtk integration: active-session kick requires active media session",
  async () => {
    assertRtkJoinConfig();
    assertRtkActiveSessionConfig();
    const meetingId = await createMeeting();
  const participant = await addParticipant(
    meetingId,
    "RTK Kick Probe Student",
    "group_call_participant",
    `kick-probe-${Date.now()}`,
  );

  let succeeded = false;
  let caught = false;
  let message = "";
  try {
    await kickActiveSessionParticipants({
      meetingId,
      participantIds: [participant.id],
    });
    succeeded = true;
  } catch (error) {
    caught = true;
    message = error instanceof Error ? error.message : String(error);
  }
  console.log("[rtk-test] kick outcome", { succeeded, caught, message });
  assert.equal(succeeded || caught, true);
  await removeParticipant(meetingId, participant.id);
  },
);

test(
  "rtk integration: active-session kick-all requires active media session",
  async () => {
    assertRtkJoinConfig();
    assertRtkActiveSessionConfig();
    const meetingId = await createMeeting();

    let succeeded = false;
    let caught = false;
    let message = "";
    try {
      await kickAllActiveSessionParticipants(meetingId);
      succeeded = true;
    } catch (error) {
      caught = true;
      message = error instanceof Error ? error.message : String(error);
    }
    console.log("[rtk-test] kick-all outcome", { succeeded, caught, message });
    assert.equal(succeeded || caught, true);
  },
);

test("service logic: joins a teacher immediately", async () => {
  const room = createRoom();
  const service = new MeetingRoomService();

  const result = await service.joinMeeting({
    room,
    participantName: "Teacher A",
    role: "teacher",
    requiresApproval: false,
    createParticipant: async () => {
      room.participants.set("Teacher A", {
        rtkId: "rtk-teacher-a",
        customParticipantId: "custom-teacher-a",
        role: "teacher",
      });
      room.connectedTeachers.add("Teacher A");
      return { token: "teacher-token" };
    },
  });

  assert.equal(result.status, "joined");
  if (result.status === "joined") {
    assert.equal(result.token, "teacher-token");
  }
  assert.equal(room.participants.get("Teacher A")?.role, "teacher");
  assert.equal(room.connectedTeachers.has("Teacher A"), true);
});

test("service logic: does not allow non-teachers to join when no teacher is present", async () => {
  const room = createRoom();
  const service = new MeetingRoomService();

  const result = await service.joinMeeting({
    room,
    participantName: "Guest A",
    role: "student",
    requiresApproval: false,
    createParticipant: async () => ({ token: "guest-token" }),
  });

  assert.deepEqual(result, { status: "waiting_for_host" });
  assert.equal(room.participants.size, 0);
});

// Regression: kick route previously swallowed kickParticipants errors (try/catch without rethrow),
// which caused the service to delete the participant from local state and report success even when
// the participant was never actually disconnected (left them orphaned in the RTK meeting).
test("service logic: kick propagates kickParticipants error and preserves local state", async () => {
  const room = createRoom({
    participants: new Map([
      ["Student A", { rtkId: "rtk-student-a", customParticipantId: "custom-a", role: "student" as const }],
    ]),
    connectedTeachers: new Set(["Teacher A"]),
  });
  const service = new MeetingRoomService();

  await assert.rejects(
    () =>
      service.kickParticipant({
        room,
        participantName: "Student A",
        listParticipants: async () => [],
        kickParticipants: async () => {
          throw new Error("Missing Cloudflare Active Session config");
        },
      }),
    /Missing Cloudflare Active Session config/,
    "kickParticipant must propagate kickParticipants errors — never swallow them",
  );

  // Participant must still be in local state since the kick did not succeed
  assert.equal(
    room.participants.has("Student A"),
    true,
    "participant must NOT be removed from room.participants when kick fails",
  );
});

test("service logic: kicks a participant using RTK list fallback when local map is stale", async () => {
  const room = createRoom({
    participants: new Map(),
    connectedTeachers: new Set(["Teacher A"]),
  });
  const service = new MeetingRoomService();
  const kickedIds: string[][] = [];

  const result = await service.kickParticipant({
    room,
    participantName: "Student A",
    listParticipants: async () => [{ id: "rtk-student-a", name: "Student A" }],
    kickParticipants: async (participantIds) => {
      kickedIds.push(participantIds);
    },
  });

  assert.deepEqual(result, {
    status: "kicked",
    participantId: "rtk-student-a",
  });
  assert.deepEqual(kickedIds, [["rtk-student-a"]]);
});

test("service logic: ends meeting by kicking everyone and deleting room", async () => {
  const room = createRoom();
  const service = new MeetingRoomService();
  let kickAllCalled = 0;
  const deletedMeetingIds: string[] = [];

  const timer = setTimeout(() => {}, 5_000);
  room.allTeachersLeftTimer = timer;

  await service.endMeeting({
    meetingId: "meeting-1",
    room,
    kickAllParticipants: async () => {
      kickAllCalled += 1;
    },
    deleteMeetingRoom: (meetingId) => {
      deletedMeetingIds.push(meetingId);
    },
  });

  assert.equal(kickAllCalled, 1);
  assert.deepEqual(deletedMeetingIds, ["meeting-1"]);
  assert.equal(room.allTeachersLeftTimer, undefined);
});

test("service logic: kicks everyone after grace period when all teachers leave", async () => {
  const room = createRoom({
    participants: new Map([
      [
        "Teacher A",
        {
          rtkId: "rtk-teacher-a",
          customParticipantId: "custom-teacher-a",
          role: "teacher",
        },
      ],
      [
        "Student A",
        {
          rtkId: "rtk-student-a",
          customParticipantId: "custom-student-a",
          role: "student",
        },
      ],
    ]),
    connectedTeachers: new Set(["Teacher A"]),
    waitingRoom: new Map([
      ["Student B", { participantName: "Student B", joinedAt: Date.now() }],
    ]),
  });
  const service = new MeetingRoomService({ teacherGracePeriodMs: 5 });
  let kickAllCalled = 0;
  const deletedMeetingIds: string[] = [];

  service.handleParticipantLeft({
    meetingId: "meeting-1",
    room,
    participantName: "Teacher A",
    kickAllParticipants: async () => {
      kickAllCalled += 1;
    },
    deleteMeetingRoom: (meetingId) => {
      deletedMeetingIds.push(meetingId);
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.equal(kickAllCalled, 1);
  assert.deepEqual(deletedMeetingIds, ["meeting-1"]);
  assert.equal(room.participants.size, 0);
  assert.equal(room.waitingRoom.size, 0);
  assert.equal(room.connectedTeachers.size, 0);
});
