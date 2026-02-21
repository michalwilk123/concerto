import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meeting } from "@/db/schema";
import { requireGroupMember } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
	const groupId = request.nextUrl.searchParams.get("groupId");
	if (!groupId) {
		return NextResponse.json({ error: "groupId is required" }, { status: 400 });
	}

	const { error } = await requireGroupMember(groupId);
	if (error) return error;

	try {
		const meetings = await db
			.select()
			.from(meeting)
			.where(eq(meeting.groupId, groupId))
			.orderBy(desc(meeting.createdAt));

		return NextResponse.json(meetings);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error("Failed to list meetings:", message);
		return NextResponse.json({ error: `Failed to list meetings: ${message}` }, { status: 500 });
	}
}
