import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meeting } from "@/db/schema";
import { requireAuth, requireGroupMember } from "@/lib/auth-helpers";
import { listMeetingFiles, uploadMeetingFile } from "@/lib/services/file-service";
import { getSessionFromRequest } from "../../../auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  const { meetingId } = await params;

  const rawSession = await getSessionFromRequest(req);
  const { error: authError, session } = await requireAuth(rawSession);
  if (authError) return authError;

  const [mtg] = await db
    .select({ groupId: meeting.groupId })
    .from(meeting)
    .where(eq(meeting.id, meetingId))
    .limit(1);

  if (!mtg) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const { error } = await requireGroupMember(mtg.groupId, session);
  if (error) return error;

  const folderId = req.nextUrl.searchParams.get("folderId") || null;
  const files = await listMeetingFiles({ meetingId, folderId });
  return NextResponse.json(files);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  const { meetingId } = await params;

  const rawSession = await getSessionFromRequest(req);
  const { error: authError, session } = await requireAuth(rawSession);
  if (authError) return authError;

  const [mtg] = await db
    .select({ groupId: meeting.groupId })
    .from(meeting)
    .where(eq(meeting.id, meetingId))
    .limit(1);

  if (!mtg) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const { error } = await requireGroupMember(mtg.groupId, session);
  if (error) return error;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const folderId = (formData.get("folderId") as string) || null;

  try {
    const result = await uploadMeetingFile({
      file,
      meetingId,
      groupId: mtg.groupId,
      folderId,
      uploadedById: session.user.id,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
