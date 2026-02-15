import { eq, sum } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { file } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
	const { error, session } = await requireAdmin();
	if (error) return error;

	const [result] = await db
		.select({ totalBytes: sum(file.size) })
		.from(file)
		.where(eq(file.ownerId, session?.user.id));

	return NextResponse.json({ totalBytes: Number(result?.totalBytes ?? 0) });
}
