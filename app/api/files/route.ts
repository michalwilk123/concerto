import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meeting } from "@/db/schema";
import { requireGroupMember, requireGroupTeacher } from "@/lib/auth-helpers";
import {
  deleteFileById,
  listGroupFiles,
  parseFileId,
  readFileById,
  renameFileById,
} from "@/lib/services/file-service";

async function resolveGroupId(parsed: { groupId: string | null; meetingId: string | null }): Promise<string | null> {
  if (parsed.groupId) return parsed.groupId;
  if (parsed.meetingId) {
    const [row] = await db
      .select({ groupId: meeting.groupId })
      .from(meeting)
      .where(eq(meeting.id, parsed.meetingId))
      .limit(1);
    return row?.groupId ?? null;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  // Serve a file by id
  if (id) {
    const parsed = parseFileId(id);
    if (!parsed) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const groupId = await resolveGroupId(parsed);
    if (!groupId) return NextResponse.json({ error: "File not found" }, { status: 404 });

    const { error } = await requireGroupMember(groupId);
    if (error) return error;

    const loaded = await readFileById(id);
    if (!loaded) return NextResponse.json({ error: "File not found" }, { status: 404 });

    const download = searchParams.get("download") === "true";
    return new NextResponse(new Uint8Array(loaded.buffer), {
      headers: {
        "Content-Type": loaded.mimeType,
        "Content-Length": String(loaded.buffer.length),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${loaded.filename}"`,
      },
    });
  }

  // List files in a group/folder
  const groupId = searchParams.get("groupId");
  if (!groupId) return NextResponse.json({ error: "groupId is required" }, { status: 400 });

  const { error } = await requireGroupMember(groupId);
  if (error) return error;

  const files = await listGroupFiles({ groupId, folderId: searchParams.get("folderId") });
  return NextResponse.json(files);
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const parsed = parseFileId(id);
  if (!parsed) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const groupId = await resolveGroupId(parsed);
  if (!groupId) return NextResponse.json({ error: "File not found" }, { status: 404 });

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
  if (!parsed) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const groupId = await resolveGroupId(parsed);
  if (!groupId) return NextResponse.json({ error: "File not found" }, { status: 404 });

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
