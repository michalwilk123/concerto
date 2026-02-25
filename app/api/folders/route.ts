import { and, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { folder } from "@/db/schema";
import { requireGroupMember, requireGroupTeacher } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
	const { name, parentId, groupId } = await req.json();

	if (!groupId) {
		return NextResponse.json({ error: "groupId is required" }, { status: 400 });
	}

	const { error } = await requireGroupTeacher(groupId);
	if (error) return error;

	if (!name || typeof name !== "string" || !name.trim()) {
		return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
	}

	const trimmedName = name.trim();
	const parentCondition = parentId ? eq(folder.parentId, parentId) : isNull(folder.parentId);

	const existing = await db
		.select({ id: folder.id })
		.from(folder)
		.where(and(eq(folder.groupId, groupId), eq(folder.name, trimmedName), parentCondition))
		.limit(1);

	if (existing.length > 0) {
		return NextResponse.json(
			{ error: "A folder with this name already exists here" },
			{ status: 409 },
		);
	}

	const folderId = nanoid();
	const [inserted] = await db
		.insert(folder)
		.values({
			id: folderId,
			name: trimmedName,
			groupId,
			parentId: parentId || null,
			isSystem: false,
		})
		.returning();

	return NextResponse.json(inserted);
}

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const parentId = searchParams.get("parentId");
	const groupId = searchParams.get("groupId");

	if (!groupId) {
		return NextResponse.json({ error: "groupId is required" }, { status: 400 });
	}

	const { error } = await requireGroupMember(groupId);
	if (error) return error;

	const whereClause = parentId
		? and(eq(folder.groupId, groupId), eq(folder.parentId, parentId))
		: and(eq(folder.groupId, groupId), isNull(folder.parentId));

	const folders = await db.select().from(folder).where(whereClause);
	console.log(
		`[folders/list] groupId=${groupId}, parentId=${parentId ?? "ROOT"} → ${folders.length} folders: ${folders.map((f) => `${f.name}(id=${f.id},system=${f.isSystem})`).join(", ") || "none"}`,
	);
	return NextResponse.json(folders);
}
