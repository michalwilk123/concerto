import { afterAll, beforeAll, test } from "bun:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { chatMessage, chatReaction, group, groupMember, meeting, user } from "@/db/schema";
import { auth } from "@/lib/auth";

// ─── Test fixtures ───────────────────────────────────────────────────────────

const TEST_ID = `mobile-test-${Date.now()}`;
const TEST_EMAIL = `${TEST_ID}@test.local`;
const TEST_PASSWORD = "testpass1234";
const TEST_NAME = "Mobile Test User";
const GROUP_ID = `grp-${TEST_ID}`;
const MEETING_ID = `mtg-${TEST_ID}`;
const TEACHER_EMAIL = `teacher-${TEST_ID}@test.local`;
const TEACHER_NAME = "Mobile Teacher User";

let userId: string;
let bearerToken: string;
let teacherUserId: string;
let teacherBearerToken: string;

// ─── Setup & teardown ────────────────────────────────────────────────────────

beforeAll(async () => {
  // Create test user via Better Auth
  const signUpRes = await auth.api.signUpEmail({
    body: { email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME },
  });
  assert.ok(signUpRes.user, "Failed to create test user");
  userId = signUpRes.user.id;

  // Sign in to get session token
  const signInRes = await auth.api.signInEmail({
    body: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  assert.ok(signInRes.token, "Failed to sign in");
  bearerToken = signInRes.token;

  // Create test group and membership
  await db.insert(group).values({ id: GROUP_ID, name: "Mobile Test Group" });
  await db.insert(groupMember).values({
    id: nanoid(),
    groupId: GROUP_ID,
    userId,
    role: "student",
  });

  const teacherSignUpRes = await auth.api.signUpEmail({
    body: { email: TEACHER_EMAIL, password: TEST_PASSWORD, name: TEACHER_NAME },
  });
  assert.ok(teacherSignUpRes.user, "Failed to create teacher test user");
  teacherUserId = teacherSignUpRes.user.id;
  await db.insert(groupMember).values({
    id: nanoid(),
    groupId: GROUP_ID,
    userId: teacherUserId,
    role: "teacher",
  });

  const teacherSignInRes = await auth.api.signInEmail({
    body: { email: TEACHER_EMAIL, password: TEST_PASSWORD },
  });
  assert.ok(teacherSignInRes.token, "Failed to sign in teacher");
  teacherBearerToken = teacherSignInRes.token;

  // Create test meeting
  await db.insert(meeting).values({
    id: MEETING_ID,
    name: "Mobile Test Meeting",
    groupId: GROUP_ID,
    isPublic: false,
    requiresApproval: false,
  });
});

afterAll(async () => {
  await db
    .delete(chatReaction)
    .where(
      eq(
        chatReaction.messageId,
        db
          .select({ id: chatMessage.id })
          .from(chatMessage)
          .where(eq(chatMessage.meetingId, MEETING_ID)),
      ),
    )
    .catch(() => {});
  await db
    .delete(chatMessage)
    .where(eq(chatMessage.meetingId, MEETING_ID))
    .catch(() => {});
  await db
    .delete(meeting)
    .where(eq(meeting.id, MEETING_ID))
    .catch(() => {});
  await db
    .delete(groupMember)
    .where(eq(groupMember.groupId, GROUP_ID))
    .catch(() => {});
  await db
    .delete(group)
    .where(eq(group.id, GROUP_ID))
    .catch(() => {});
  await db
    .delete(user)
    .where(eq(user.id, teacherUserId))
    .catch(() => {});
  await db
    .delete(user)
    .where(eq(user.id, userId))
    .catch(() => {});
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeReq(url: string, init?: RequestInit): NextRequest {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${bearerToken}`);
  return new NextRequest(new URL(url, "http://localhost"), { ...init, headers } as any);
}

function makeUnauthReq(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost"), init as any);
}

function makeTeacherReq(url: string, init?: RequestInit): NextRequest {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${teacherBearerToken}`);
  return new NextRequest(new URL(url, "http://localhost"), { ...init, headers } as any);
}

function params<T>(val: T): { params: Promise<T> } {
  return { params: Promise.resolve(val) };
}

// ─── GET /api/mobile/groups ──────────────────────────────────────────────────

test("GET /api/mobile/groups: returns user's groups with Bearer auth", async () => {
  const { GET } = await import("./groups/route");
  const res = await GET(makeReq("/api/mobile/groups"));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data), "should return an array");
  const found = data.find((g: any) => g.id === GROUP_ID);
  assert.ok(found, "should include the test group");
  assert.equal(found.name, "Mobile Test Group");
});

test("GET /api/mobile/groups: rejects unauthenticated request", async () => {
  const { GET } = await import("./groups/route");
  const res = await GET(makeUnauthReq("/api/mobile/groups"));
  assert.equal(res.status, 401);
});

// ─── GET /api/mobile/groups/[groupId]/meetings ───────────────────────────────

test("GET /api/mobile/groups/[groupId]/meetings: returns meetings for group", async () => {
  const { GET } = await import("./groups/[groupId]/meetings/route");
  const res = await GET(
    makeReq(`/api/mobile/groups/${GROUP_ID}/meetings`),
    params({ groupId: GROUP_ID }),
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data));
  const found = data.find((m: any) => m.id === MEETING_ID);
  assert.ok(found, "should include the test meeting");
  assert.equal(found.name, "Mobile Test Meeting");
});

test("GET /api/mobile/groups/[groupId]/meetings: rejects non-member", async () => {
  // Create a second user that is NOT a member of the group
  const otherEmail = `other-${TEST_ID}@test.local`;
  const signUpRes = await auth.api.signUpEmail({
    body: { email: otherEmail, password: TEST_PASSWORD, name: "Other User" },
  });
  assert.ok(signUpRes.user);
  const otherUserId = signUpRes.user.id;

  const signInRes = await auth.api.signInEmail({
    body: { email: otherEmail, password: TEST_PASSWORD },
  });
  assert.ok(signInRes.token);

  const { GET } = await import("./groups/[groupId]/meetings/route");
  const req = new NextRequest(
    new URL(`/api/mobile/groups/${GROUP_ID}/meetings`, "http://localhost"),
    {
      headers: { Authorization: `Bearer ${signInRes.token}` },
    },
  );
  const res = await GET(req, params({ groupId: GROUP_ID }));
  assert.equal(res.status, 403);

  // Cleanup other user
  await db
    .delete(user)
    .where(eq(user.id, otherUserId))
    .catch(() => {});
});

// ─── GET /api/mobile/groups/[groupId]/files ──────────────────────────────────

test("GET /api/mobile/groups/[groupId]/files: returns files (empty list for new group)", async () => {
  const { GET } = await import("./groups/[groupId]/files/route");
  const res = await GET(
    makeReq(`/api/mobile/groups/${GROUP_ID}/files`),
    params({ groupId: GROUP_ID }),
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data));
});

// ─── GET /api/mobile/meetings/[meetingId]/files ──────────────────────────────

test("GET /api/mobile/meetings/[meetingId]/files: returns meeting files", async () => {
  const { GET } = await import("./meetings/[meetingId]/files/route");
  const res = await GET(
    makeReq(`/api/mobile/meetings/${MEETING_ID}/files`),
    params({ meetingId: MEETING_ID }),
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data));
});

test("POST /api/mobile/meetings/[meetingId]/join: teacher can join immediately as host", async () => {
  const { POST } = await import("./meetings/[meetingId]/join/route");
  const res = await POST(
    makeTeacherReq(`/api/mobile/meetings/${MEETING_ID}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantName: TEACHER_NAME }),
    }),
    params({ meetingId: MEETING_ID }),
  );

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, "joined");
  assert.equal(data.role, "teacher");
  assert.ok(data.token, "teacher join should return a room token");
});

// ─── POST & GET /api/mobile/meetings/[meetingId]/chat ────────────────────────

test("POST /api/mobile/meetings/[meetingId]/chat: sends a message", async () => {
  const { POST } = await import("./meetings/[meetingId]/chat/route");
  const res = await POST(
    makeReq(`/api/mobile/meetings/${MEETING_ID}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Hello from mobile test" }),
    }),
    params({ meetingId: MEETING_ID }),
  );
  assert.equal(res.status, 200);
  const msg = await res.json();
  assert.equal(msg.content, "Hello from mobile test");
  assert.equal(msg.senderName, TEST_NAME);
  assert.equal(msg.meetingId, MEETING_ID);
  assert.ok(msg.id, "should have an id");
});

test("GET /api/mobile/meetings/[meetingId]/chat: retrieves messages", async () => {
  const { GET } = await import("./meetings/[meetingId]/chat/route");
  const res = await GET(
    makeReq(`/api/mobile/meetings/${MEETING_ID}/chat`),
    params({ meetingId: MEETING_ID }),
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data));
  assert.ok(data.length >= 1, "should have at least the message we sent");
  const found = data.find((m: any) => m.content === "Hello from mobile test");
  assert.ok(found, "should find our test message");
});

test("POST /api/mobile/meetings/[meetingId]/chat: rejects empty content", async () => {
  const { POST } = await import("./meetings/[meetingId]/chat/route");
  const res = await POST(
    makeReq(`/api/mobile/meetings/${MEETING_ID}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "" }),
    }),
    params({ meetingId: MEETING_ID }),
  );
  assert.equal(res.status, 400);
});

test("POST /api/mobile/meetings/[meetingId]/chat: rejects oversized content", async () => {
  const { POST } = await import("./meetings/[meetingId]/chat/route");
  const res = await POST(
    makeReq(`/api/mobile/meetings/${MEETING_ID}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "x".repeat(2001) }),
    }),
    params({ meetingId: MEETING_ID }),
  );
  assert.equal(res.status, 400);
});

// ─── POST /api/mobile/chat/reactions ─────────────────────────────────────────

test("POST /api/mobile/chat/reactions: toggles reaction on a message", async () => {
  const [msg] = await db
    .select({ id: chatMessage.id })
    .from(chatMessage)
    .where(eq(chatMessage.meetingId, MEETING_ID))
    .limit(1);
  assert.ok(msg, "should have a test message");

  const { POST } = await import("./chat/reactions/route");
  const res = await POST(
    makeReq("/api/mobile/chat/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: msg.id, emoji: "👍" }),
    }),
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.reactions, "should return reactions");
  const thumbs = data.reactions.find((r: any) => r.emoji === "👍");
  assert.ok(thumbs, "should have thumbs up reaction");
  assert.equal(thumbs.count, 1);
  assert.equal(thumbs.reacted, true);
});

test("POST /api/mobile/chat/reactions: rejects invalid emoji", async () => {
  const [msg] = await db
    .select({ id: chatMessage.id })
    .from(chatMessage)
    .where(eq(chatMessage.meetingId, MEETING_ID))
    .limit(1);
  assert.ok(msg);

  const { POST } = await import("./chat/reactions/route");
  const res = await POST(
    makeReq("/api/mobile/chat/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: msg.id, emoji: "🤡" }),
    }),
  );
  assert.equal(res.status, 400);
});

// ─── GET /api/mobile/groups/[groupId]/files/[fileId] ─────────────────────────

test("GET /api/mobile/groups/[groupId]/files/[fileId]: 404 for nonexistent file", async () => {
  const { GET } = await import("./groups/[groupId]/files/[fileId]/route");
  const res = await GET(
    makeReq(`/api/mobile/groups/${GROUP_ID}/files/nonexistent-file`),
    params({ groupId: GROUP_ID, fileId: "nonexistent-file" }),
  );
  assert.equal(res.status, 404);
});
