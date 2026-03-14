import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function readRoute(relativePath: string): string {
  return readFileSync(join(process.cwd(), "app/api/mobile", relativePath), "utf-8");
}

// ─── Permission / policy checks (static source analysis) ─────────────────────

test("mobile groups route requires requireAuth (not requireAdmin)", () => {
  const src = readRoute("groups/route.ts");
  assert.ok(src.includes("requireAuth"), "should use requireAuth");
  assert.ok(!src.includes("requireAdmin"), "should not use requireAdmin");
});

test("mobile group meetings route requires requireGroupMember", () => {
  const src = readRoute("groups/[groupId]/meetings/route.ts");
  assert.ok(src.includes("requireGroupMember"), "should use requireGroupMember");
  assert.ok(!src.includes("requireGroupTeacher"), "should not require teacher");
});

test("mobile group files route requires requireGroupMember for GET and POST", () => {
  const src = readRoute("groups/[groupId]/files/route.ts");
  assert.ok(src.includes("requireGroupMember"), "should use requireGroupMember");
  assert.ok(!src.includes("requireGroupTeacher"), "should not require teacher");
  assert.ok(!src.includes("requireAdmin"), "should not require admin");
});

test("mobile file download route requires requireGroupMember", () => {
  const src = readRoute("groups/[groupId]/files/[fileId]/route.ts");
  assert.ok(src.includes("requireGroupMember"), "should use requireGroupMember");
});

test("mobile meeting join always uses student role", () => {
  const src = readRoute("meetings/[meetingId]/join/route.ts");
  assert.ok(src.includes("requireAuth"), "should use requireAuth");
  assert.ok(src.includes('"student"'), "should hardcode student role");
  assert.ok(!src.includes("determineRole"), "should not call determineRole");
});

test("mobile meeting rejoin requires auth (not guest)", () => {
  const src = readRoute("meetings/[meetingId]/rejoin/route.ts");
  assert.ok(src.includes("requireAuth"), "should use requireAuth");
  assert.ok(src.includes("requireGroupMember"), "should verify group membership");
});

test("mobile meeting files route requires requireGroupMember", () => {
  const src = readRoute("meetings/[meetingId]/files/route.ts");
  assert.ok(src.includes("requireGroupMember"), "should use requireGroupMember");
  assert.ok(src.includes("requireAuth"), "should use requireAuth");
});

test("mobile chat route requires auth and group membership (no guest access)", () => {
  const src = readRoute("meetings/[meetingId]/chat/route.ts");
  assert.ok(src.includes("requireAuth"), "should use requireAuth");
  assert.ok(src.includes("requireGroupMember"), "should use requireGroupMember");
  assert.ok(!src.includes("participantName"), "should not have guest participantName logic");
  assert.ok(!src.includes("getOrRestoreRoom"), "should not use getOrRestoreRoom for guest check");
});

test("mobile reactions route requires requireAuth", () => {
  const src = readRoute("chat/reactions/route.ts");
  assert.ok(src.includes("requireAuth"), "should use requireAuth");
});

test("no mobile route uses guest-join or allows unauthenticated access", () => {
  const routes = [
    "groups/route.ts",
    "groups/[groupId]/meetings/route.ts",
    "groups/[groupId]/files/route.ts",
    "groups/[groupId]/files/[fileId]/route.ts",
    "meetings/[meetingId]/join/route.ts",
    "meetings/[meetingId]/rejoin/route.ts",
    "meetings/[meetingId]/files/route.ts",
    "meetings/[meetingId]/chat/route.ts",
    "chat/reactions/route.ts",
  ];

  for (const route of routes) {
    const src = readRoute(route);
    assert.ok(!src.includes("guest-join"), `${route} should not reference guest-join`);
    assert.ok(!src.includes("guest_join"), `${route} should not reference guest_join`);
    assert.ok(
      src.includes("requireAuth") || src.includes("requireGroupMember"),
      `${route} must require authentication`,
    );
  }
});

test("mobile join route uses meetingRoomService.joinMeeting", () => {
  const src = readRoute("meetings/[meetingId]/join/route.ts");
  assert.ok(src.includes("meetingRoomService"), "should use meetingRoomService");
  assert.ok(src.includes("ensureRealtimeKitMeeting"), "should ensure RTK meeting exists");
  assert.ok(src.includes("createRealtimeKitParticipant"), "should create RTK participant");
});

test("mobile chat POST has rate limiting and content length validation", () => {
  const src = readRoute("meetings/[meetingId]/chat/route.ts");
  assert.ok(src.includes("MIN_MESSAGE_INTERVAL_MS"), "should have rate limiting");
  assert.ok(src.includes("MAX_CONTENT_LENGTH"), "should have content length limit");
  assert.ok(src.includes("pg_notify"), "should notify via pg_notify");
});

test("mobile reactions route validates emoji against allowlist", () => {
  const src = readRoute("chat/reactions/route.ts");
  assert.ok(src.includes("ALLOWED_EMOJIS"), "should validate emojis");
  assert.ok(src.includes("pg_notify"), "should notify via pg_notify");
});

test("all mobile routes use getSessionFromRequest (not Next.js headers())", () => {
  const routes = [
    "groups/route.ts",
    "groups/[groupId]/meetings/route.ts",
    "groups/[groupId]/files/route.ts",
    "groups/[groupId]/files/[fileId]/route.ts",
    "meetings/[meetingId]/join/route.ts",
    "meetings/[meetingId]/rejoin/route.ts",
    "meetings/[meetingId]/files/route.ts",
    "meetings/[meetingId]/chat/route.ts",
    "chat/reactions/route.ts",
  ];

  for (const route of routes) {
    const src = readRoute(route);
    assert.ok(
      src.includes("getSessionFromRequest"),
      `${route} should use getSessionFromRequest`,
    );
    assert.ok(
      !src.includes("from \"next/headers\""),
      `${route} should not import from next/headers`,
    );
  }
});
