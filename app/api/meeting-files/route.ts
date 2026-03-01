import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meeting } from "@/db/schema";
import { requireGroupMember, requireGroupTeacher } from "@/lib/auth-helpers";
import { listGroupFiles, uploadGroupFile } from "@/lib/services/file-service";

async function getMeetingGroupId(meetingId: string): Promise<string | null> {
  const [row] = await db
    .select({ groupId: meeting.groupId })
    .from(meeting)
    .where(eq(meeting.id, meetingId))
    .limit(1);
  return row?.groupId ?? null;
}

export async function GET(req: NextRequest) {
  const meetingId = req.nextUrl.searchParams.get("meetingId");
  if (!meetingId) return NextResponse.json({ error: "meetingId is required" }, { status: 400 });

  const groupId = await getMeetingGroupId(meetingId);
  if (!groupId) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  const { error } = await requireGroupMember(groupId);
  if (error) return error;

  const files = await listGroupFiles({ groupId, folderId: meetingId });
  return NextResponse.json(files);
}

export async function POST(req: NextRequest) {
  console.log(`[meeting-files/post] Incoming request: ${req.nextUrl.toString()}`);

  const formData = await req.formData();
  const meetingId = formData.get("meetingId") as string | null;
  const uploadedFile = formData.get("file") as File | null;

  console.log(
    `[meeting-files/post] Parsed formData: meetingId=${meetingId ?? "MISSING"}, hasFile=${Boolean(uploadedFile)}, fileName=${uploadedFile?.name ?? "N/A"}, fileSize=${uploadedFile?.size ?? 0}`,
  );

  if (!meetingId) return NextResponse.json({ error: "meetingId is required" }, { status: 400 });
  if (!uploadedFile) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const groupId = await getMeetingGroupId(meetingId);
  console.log(
    `[meeting-files/post] Resolved meeting group: meetingId=${meetingId}, groupId=${groupId ?? "NOT_FOUND"}`,
  );
  if (!groupId) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  const { error } = await requireGroupTeacher(groupId);
  if (error) return error;

  try {
    console.log(
      `[meeting-files/post] Upload start: groupId=${groupId}, meetingId=${meetingId}, fileName=${uploadedFile.name}`,
    );
    const fileDoc = await uploadGroupFile({ file: uploadedFile, groupId, folderId: meetingId });
    console.log(
      `[meeting-files/post] Upload success: id=${fileDoc.id}, url=${fileDoc.url}, size=${fileDoc.size}`,
    );
    return NextResponse.json(fileDoc);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    const status = message.includes("already exists") ? 409 : 400;
    console.error(
      `[meeting-files/post] Upload failed: groupId=${groupId}, meetingId=${meetingId}, message=${message}`,
      err,
    );
    return NextResponse.json({ error: message }, { status });
  }
}
