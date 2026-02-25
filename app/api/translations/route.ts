import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdmin, requireAuth } from "@/lib/auth-helpers";

const DATA_DIR = path.join(process.cwd(), "data");
const TRANSLATIONS_FILE = path.join(DATA_DIR, "translations.json");

async function readOverrides(): Promise<Record<string, string>> {
	try {
		const raw = await readFile(TRANSLATIONS_FILE, "utf-8");
		return JSON.parse(raw) as Record<string, string>;
	} catch {
		return {};
	}
}

export async function GET() {
	const { error } = await requireAuth();
	if (error) return error;

	const overrides = await readOverrides();
	return NextResponse.json(overrides);
}

export async function PUT(req: Request) {
	const { error } = await requireAdmin();
	if (error) return error;

	const body = (await req.json()) as Record<string, string>;

	await mkdir(DATA_DIR, { recursive: true });
	await writeFile(TRANSLATIONS_FILE, JSON.stringify(body, null, 2), "utf-8");

	return NextResponse.json({ ok: true });
}
