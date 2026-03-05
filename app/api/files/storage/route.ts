import { type NextRequest, NextResponse } from "next/server";
import { requireGroupMember } from "@/lib/auth-helpers";
import { listObjects } from "@/lib/s3-client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");

  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  const { error } = await requireGroupMember(groupId);
  if (error) return error;

  const objects = await listObjects(`${groupId}/`);
  const totalBytes = objects.reduce((sum, o) => sum + o.size, 0);

  return NextResponse.json({ totalBytes });
}
