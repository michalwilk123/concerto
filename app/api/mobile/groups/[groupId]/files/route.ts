import { type NextRequest, NextResponse } from "next/server";
import { requireGroupMember, requireGroupUploadAccess } from "@/lib/auth-helpers";
import { listGroupFiles, uploadGroupFile } from "@/lib/services/file-service";
import { getSessionFromRequest } from "../../../auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const session = await getSessionFromRequest(req);
  const { error } = await requireGroupMember(groupId, session);
  if (error) return error;

  const folderId = req.nextUrl.searchParams.get("folderId") || null;
  const files = await listGroupFiles({ groupId, folderId });
  return NextResponse.json(files);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const session = await getSessionFromRequest(req);
  const { error, session: validated } = await requireGroupUploadAccess(groupId, session);
  if (error) return error;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const folderId = (formData.get("folderId") as string) || null;

  try {
    const result = await uploadGroupFile({
      file,
      groupId,
      folderId,
      uploadedById: validated.user.id,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
