import { nanoid } from "nanoid";
import { and, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chatMessage, chatReaction } from "@/db/schema";
import { requireAuth } from "@/lib/auth-helpers";
import type { ChatReaction } from "@/types/chat";

const CHAT_NOTIFY_CHANNEL = "chat_messages";
const ALLOWED_EMOJIS = new Set(["👍", "❤️", "😂", "😮", "😢", "👏"]);

export async function POST(req: NextRequest) {
	const { error, session } = await requireAuth();
	if (error) return error;

	const body = (await req.json()) as { messageId?: unknown; emoji?: unknown };
	const messageId = typeof body.messageId === "string" ? body.messageId : "";
	const emoji = typeof body.emoji === "string" ? body.emoji : "";

	if (!messageId || !emoji) {
		return NextResponse.json({ error: "messageId and emoji are required" }, { status: 400 });
	}
	if (!ALLOWED_EMOJIS.has(emoji)) {
		return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
	}

	// Verify message exists and get its groupId + meetingId
	const [message] = await db
		.select({ id: chatMessage.id, groupId: chatMessage.groupId, meetingId: chatMessage.meetingId })
		.from(chatMessage)
		.where(eq(chatMessage.id, messageId))
		.limit(1);

	if (!message) {
		return NextResponse.json({ error: "Message not found" }, { status: 404 });
	}

	// Toggle: remove if exists, add if not
	const [existing] = await db
		.select({ id: chatReaction.id })
		.from(chatReaction)
		.where(
			and(
				eq(chatReaction.messageId, messageId),
				eq(chatReaction.userId, session.user.id),
				eq(chatReaction.emoji, emoji),
			),
		)
		.limit(1);

	if (existing) {
		await db.delete(chatReaction).where(eq(chatReaction.id, existing.id));
	} else {
		await db.insert(chatReaction).values({
			id: nanoid(),
			messageId,
			userId: session.user.id,
			userName: session.user.name,
			emoji,
		});
	}

	// Fetch updated reactions for this message
	const allReactions = await db
		.select()
		.from(chatReaction)
		.where(eq(chatReaction.messageId, messageId));

	const emojiMap = new Map<string, { userNames: string[]; reacted: boolean }>();
	for (const r of allReactions) {
		const entry = emojiMap.get(r.emoji) ?? { userNames: [], reacted: false };
		entry.userNames.push(r.userName);
		if (r.userId === session.user.id) entry.reacted = true;
		emojiMap.set(r.emoji, entry);
	}

	const reactions: ChatReaction[] = Array.from(emojiMap.entries()).map(
		([e, { userNames, reacted }]) => ({
			emoji: e,
			count: userNames.length,
			userNames,
			reacted,
		}),
	);

	// Notify via pg_notify
	const payload = JSON.stringify({
		type: "reaction_update",
		messageId,
		meetingId: message.meetingId,
		reactions,
	});
	await db.execute(sql`select pg_notify(${CHAT_NOTIFY_CHANNEL}, ${payload})`);

	return NextResponse.json({ reactions });
}
