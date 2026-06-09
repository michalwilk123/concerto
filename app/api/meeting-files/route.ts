import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meeting } from "@/db/schema";
import {
  requireGroupMember,
  requireGroupTeacher,
  requireGroupUploadAccess,
} from "@/lib/auth-helpers";
import {
  deleteFileById,
  listMeetingFiles,
  parseFileId,
  renameFileById,
  uploadMeetingFile,
} from "@/lib/services/file-service";

async function getMeetingGroupId(meetingId: string): Promise<string | null> {
  const [row] = await db
    .select({ groupId: meeting.groupId })
    .from(meeting)
    .where(eq(meeting.id, meetingId))
    .limit(1);
  return row?.groupId ?? null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const meetingId = searchParams.get("meetingId");
  if (!meetingId) return NextResponse.json({ error: "meetingId is required" }, { status: 400 });

  const groupId = await getMeetingGroupId(meetingId);
  if (!groupId) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  const { error } = await requireGroupMember(groupId);
  if (error) return error;

  const folderId = searchParams.get("folderId") || null;
  const files = await listMeetingFiles({ meetingId, folderId });
  return NextResponse.json(files);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const meetingId = formData.get("meetingId") as string | null;
  const uploadedFile = formData.get("file") as File | null;
  const folderId = (formData.get("folderId") as string | null) || null;

  if (!meetingId) return NextResponse.json({ error: "meetingId is required" }, { status: 400 });
  if (!uploadedFile) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const groupId = await getMeetingGroupId(meetingId);
  if (!groupId) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  const { error, session } = await requireGroupUploadAccess(groupId);
  if (error) return error;

  try {
    const fileDoc = await uploadMeetingFile({
      file: uploadedFile,
      meetingId,
      groupId,
      folderId,
      uploadedById: session?.user.id ?? null,
    });
    return NextResponse.json(fileDoc);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    const status = message.includes("already exists") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const parsed = parseFileId(id);
  if (!parsed || !parsed.meetingId) {
    return NextResponse.json({ error: "Invalid meeting file id" }, { status: 400 });
  }

  const groupId = await getMeetingGroupId(parsed.meetingId);
  if (!groupId) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  const { error } = await requireGroupTeacher(groupId);
  if (error) return error;

  await deleteFileById(id);
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = body?.id;
  const name = body?.name;

  if (typeof id !== "string" || !id.trim()) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const parsed = parseFileId(id);
  if (!parsed || !parsed.meetingId) {
    return NextResponse.json({ error: "Invalid meeting file id" }, { status: 400 });
  }

  const groupId = await getMeetingGroupId(parsed.meetingId);
  if (!groupId) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  const { error } = await requireGroupTeacher(groupId);
  if (error) return error;

  try {
    const renamed = await renameFileById(id, name);
    if (!renamed) return NextResponse.json({ error: "File not found" }, { status: 404 });
    return NextResponse.json(renamed);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Rename failed" },
      { status: 400 },
    );
  }
}
