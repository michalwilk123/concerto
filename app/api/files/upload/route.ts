import { type NextRequest, NextResponse } from "next/server";
import { requireGroupTeacher } from "@/lib/auth-helpers";
import { uploadGroupFile } from "@/lib/services/file-service";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const groupId = formData.get("groupId") as string | null;
  const uploadedFile = formData.get("file") as File | null;
  const folderId = formData.get("folderId") as string | null;

  if (!groupId) return NextResponse.json({ error: "groupId is required" }, { status: 400 });

  const { error } = await requireGroupTeacher(groupId);
  if (error) return error;

  if (!uploadedFile) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  try {
    const fileDoc = await uploadGroupFile({ file: uploadedFile, groupId, folderId });
    return NextResponse.json(fileDoc);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 400 });
  }
}
