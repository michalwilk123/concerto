import { type NextRequest, NextResponse } from "next/server";
import { requireGroupMember, requireGroupTeacher } from "@/lib/auth-helpers";
import { deleteFileById, listGroupFiles, parseFileId, readFileById } from "@/lib/services/file-service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  // Serve a file by id
  if (id) {
    const parsed = parseFileId(id);
    if (!parsed) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const { error } = await requireGroupMember(parsed.groupId);
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

  const { error } = await requireGroupTeacher(parsed.groupId);
  if (error) return error;

  await deleteFileById(id);
  return NextResponse.json({ success: true });
}
