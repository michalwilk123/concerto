import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function readRoute(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

test("file upload route requires group member (not teacher)", () => {
  const src = readRoute("app/api/files/upload/route.ts");
  assert.ok(src.includes("requireGroupMember"), "should use requireGroupMember");
  assert.ok(!src.includes("requireGroupTeacher"), "should not use requireGroupTeacher");
});

test("meeting-files POST route requires group member for upload", () => {
  const src = readRoute("app/api/meeting-files/route.ts");
  // POST handler uses requireGroupMember for upload
  // DELETE/PATCH still use requireGroupTeacher
  assert.ok(src.includes("requireGroupMember"), "should use requireGroupMember");
  assert.ok(src.includes("requireGroupTeacher"), "should still use requireGroupTeacher for delete/rename");
});

test("recordings route requires group teacher (not just member)", () => {
  const src = readRoute("app/api/recordings/route.ts");
  assert.ok(src.includes("requireGroupTeacher"), "should use requireGroupTeacher");
  assert.ok(!src.includes("requireGroupMember"), "should not use requireGroupMember");
});

test("room rejoin route requires group member (not teacher)", () => {
  const src = readRoute("app/api/room/rejoin/route.ts");
  assert.ok(src.includes("requireGroupMember"), "should use requireGroupMember");
  assert.ok(!src.includes("requireGroupTeacher"), "should not use requireGroupTeacher");
});

test("file delete routes still require group teacher", () => {
  // meeting-files DELETE uses requireGroupTeacher
  const meetingFilesSrc = readRoute("app/api/meeting-files/route.ts");
  // Find the DELETE handler and verify it uses requireGroupTeacher
  const deleteSection = meetingFilesSrc.slice(meetingFilesSrc.indexOf("export async function DELETE"));
  assert.ok(deleteSection.includes("requireGroupTeacher"), "meeting-files DELETE should require teacher");
});

test("meeting create route requires group teacher", () => {
  const src = readRoute("app/api/room/create/route.ts");
  assert.ok(src.includes("requireGroupTeacher"), "meeting create should require teacher");
});
