import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chatMessage, chatReaction, meeting } from "@/db/schema";
import { requireAuth, requireGroupMember } from "@/lib/auth-helpers";
import type { ChatMessage, ChatReaction } from "@/types/chat";
import { getSessionFromRequest } from "../../../auth";

const CHAT_NOTIFY_CHANNEL = "chat_messages";
const MAX_CONTENT_LENGTH = 2000;
const DEFAULT_LIMIT = 100;
const MIN_MESSAGE_INTERVAL_MS = 600;

function toChatMessage(
  message: typeof chatMessage.$inferSelect,
  reactions: ChatReaction[],
): ChatMessage {
  return {
    id: message.id,
    content: message.content,
    senderId: message.senderId,
    senderName: message.senderName,
    groupId: message.groupId,
    meetingId: message.meetingId,
    reactions,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  const { meetingId } = await params;

  const rawSession = await getSessionFromRequest(req);
  const { error: authError, session } = await requireAuth(rawSession);
  if (authError) return authError;

  const [mtg] = await db
    .select({ groupId: meeting.groupId })
    .from(meeting)
    .where(eq(meeting.id, meetingId))
    .limit(1);

  if (!mtg) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const { error } = await requireGroupMember(mtg.groupId, session);
  if (error) return error;

  const rawLimit = Number(req.nextUrl.searchParams.get("limit") ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(rawLimit)
    ? Math.max(1, Math.min(200, Math.floor(rawLimit)))
    : DEFAULT_LIMIT;

  const recent = await db
    .select()
    .from(chatMessage)
    .where(eq(chatMessage.meetingId, meetingId))
    .orderBy(desc(chatMessage.createdAt))
    .limit(limit);

  if (recent.length === 0) {
    return NextResponse.json([]);
  }

  const messageIds = recent.map((m) => m.id);
  const allReactions = await db
    .select()
    .from(chatReaction)
    .where(inArray(chatReaction.messageId, messageIds));

  const reactionsByMessage = new Map<string, typeof allReactions>();
  for (const r of allReactions) {
    const list = reactionsByMessage.get(r.messageId) ?? [];
    list.push(r);
    reactionsByMessage.set(r.messageId, list);
  }

  const result = recent.reverse().map((m) => {
    const raw = reactionsByMessage.get(m.id) ?? [];
    const emojiMap = new Map<string, { userNames: string[]; reacted: boolean }>();
    for (const r of raw) {
      const entry = emojiMap.get(r.emoji) ?? { userNames: [], reacted: false };
      entry.userNames.push(r.userName);
      if (r.userId === session.user.id) entry.reacted = true;
      emojiMap.set(r.emoji, entry);
    }
    const reactions: ChatReaction[] = Array.from(emojiMap.entries()).map(
      ([emoji, { userNames, reacted }]) => ({
        emoji,
        count: userNames.length,
        userNames,
        reacted,
      }),
    );
    return toChatMessage(m, reactions);
  });

  return NextResponse.json(result);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  const { meetingId } = await params;
  const body = (await req.json()) as { content?: unknown };
  const content = typeof body.content === "string" ? body.content.trim() : "";

  if (!content) {
    return NextResponse.json({ error: "Message content is required" }, { status: 400 });
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json(
      { error: `Message cannot exceed ${MAX_CONTENT_LENGTH} characters` },
      { status: 400 },
    );
  }

  const rawSession = await getSessionFromRequest(req);
  const { error: authError, session } = await requireAuth(rawSession);
  if (authError) return authError;

  const [mtg] = await db
    .select({ groupId: meeting.groupId })
    .from(meeting)
    .where(eq(meeting.id, meetingId))
    .limit(1);

  if (!mtg) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const { error } = await requireGroupMember(mtg.groupId, session);
  if (error) return error;

  const [lastMessage] = await db
    .select({ createdAt: chatMessage.createdAt })
    .from(chatMessage)
    .where(and(eq(chatMessage.senderId, session.user.id), eq(chatMessage.meetingId, meetingId)))
    .orderBy(desc(chatMessage.createdAt))
    .limit(1);

  if (
    lastMessage &&
    Date.now() - new Date(lastMessage.createdAt).getTime() < MIN_MESSAGE_INTERVAL_MS
  ) {
    return NextResponse.json({ error: "You are sending messages too quickly" }, { status: 429 });
  }

  const [inserted] = await db
    .insert(chatMessage)
    .values({
      id: nanoid(),
      content,
      senderId: session.user.id,
      senderName: session.user.name,
      groupId: mtg.groupId,
      meetingId,
    })
    .returning();

  const msg = toChatMessage(inserted, []);
  const payload = JSON.stringify(msg);
  await db.execute(sql`select pg_notify(${CHAT_NOTIFY_CHANNEL}, ${payload})`);

  return NextResponse.json(msg);
}
