import { ilike, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
	const { error } = await requireAdmin();
	if (error) return error;

	const url = new URL(req.url);
	const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
	const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
	const search = url.searchParams.get("search")?.trim() || "";

	const offset = (page - 1) * limit;

	const whereClause = search
		? or(ilike(user.name, `%${search}%`), ilike(user.email, `%${search}%`))
		: undefined;

	const [users, countResult] = await Promise.all([
		db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
				banned: user.banned,
				banReason: user.banReason,
				isActive: user.isActive,
				createdAt: user.createdAt,
				image: user.image,
			})
			.from(user)
			.where(whereClause)
			.orderBy(user.createdAt)
			.limit(limit)
			.offset(offset),
		db
			.select({ count: sql<number>`count(*)` })
			.from(user)
			.where(whereClause),
	]);

	return NextResponse.json({
		users,
		total: Number(countResult[0].count),
		page,
		limit,
	});
}
