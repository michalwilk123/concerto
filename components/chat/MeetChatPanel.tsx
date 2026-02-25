"use client";

import { Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import { LoadingIndicator } from "@/components/ui/loading-state";
import { useTranslation } from "@/hooks/useTranslation";
import { chatApi } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import type { ChatMessage } from "@/types/chat";

const ALLOWED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "👏"];

function getChatSocketUrl() {
	if (typeof window === "undefined") return "";
	const protocol = window.location.protocol === "https:" ? "wss" : "ws";
	return `${protocol}://${window.location.host}/ws/chat`;
}

interface MeetChatPanelProps {
	meetingId: string;
}

export function MeetChatPanel({ meetingId }: MeetChatPanelProps) {
	const toast = useToast();
	const { t } = useTranslation();
	const { data: session } = useSession();
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");
	const [isSending, setIsSending] = useState(false);
	const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
	const [isLoadingHistory, setIsLoadingHistory] = useState(true);
	const scrollRef = useRef<HTMLDivElement>(null);
	const reconnectTimeoutRef = useRef<number | null>(null);

	const userId = session?.user.id ?? null;

	// Load history
	useEffect(() => {
		if (!session || !meetingId) return;
		let mounted = true;
		setIsLoadingHistory(true);

		chatApi
			.list(meetingId, 100)
			.then((history) => {
				if (mounted) setMessages(history);
			})
			.catch((error) => {
				if (mounted) {
					toast.error(error instanceof Error ? error.message : t("chat.loadHistoryFailed"));
				}
			})
			.finally(() => {
				if (mounted) setIsLoadingHistory(false);
			});

		return () => {
			mounted = false;
		};
	}, [session, meetingId, t, toast]);

	// WebSocket connection
	useEffect(() => {
		if (!session || !meetingId) return;
		let active = true;
		let ws: WebSocket | null = null;

		const connect = () => {
			if (!active) return;
			ws = new WebSocket(getChatSocketUrl());

			ws.onopen = () => {
				ws?.send(JSON.stringify({ type: "join", meetingId }));
			};

			ws.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);

					if (data.type === "reaction_update") {
						// Update reactions on an existing message
						setMessages((prev) =>
							prev.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m)),
						);
						return;
					}

					// Regular chat message
					const incoming = data as ChatMessage;
					if (incoming.meetingId !== meetingId) return;
					setMessages((prev) => {
						if (prev.some((m) => m.id === incoming.id)) return prev;
						return [...prev, incoming];
					});
				} catch {
					// ignore malformed
				}
			};

			ws.onclose = () => {
				if (active) {
					reconnectTimeoutRef.current = window.setTimeout(connect, 1200);
				}
			};
		};

		connect();

		return () => {
			active = false;
			if (reconnectTimeoutRef.current) {
				window.clearTimeout(reconnectTimeoutRef.current);
			}
			ws?.close();
		};
	}, [session, meetingId]);

	// Auto-scroll
	useEffect(() => {
		const container = scrollRef.current;
		if (!container) return;
		container.scrollTop = container.scrollHeight;
	}, []);

	const canSend = useMemo(
		() => !!session && input.trim().length > 0 && !isSending,
		[session, input, isSending],
	);

	const sendMessage = async () => {
		if (!canSend) return;
		setIsSending(true);
		const content = input.trim();
		setInput("");

		try {
			const created = await chatApi.create({ content, meetingId });
			setMessages((prev) => {
				if (prev.some((m) => m.id === created.id)) return prev;
				return [...prev, created];
			});
		} catch (error) {
			setInput(content);
			toast.error(error instanceof Error ? error.message : t("chat.sendFailed"));
		} finally {
			setIsSending(false);
		}
	};

	const toggleReaction = async (messageId: string, emoji: string) => {
		try {
			const { reactions } = await chatApi.toggleReaction({ messageId, emoji });
			setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)));
		} catch {
			// WS will update the state
		}
	};

	if (!session) return null;

	return (
		<div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
			<div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 12 }}>
				{isLoadingHistory && messages.length === 0 ? (
					<LoadingIndicator message={t("chat.loadingMessages")} size={24} minHeight="100%" />
				) : messages.length === 0 ? (
					<div
						style={{
							height: "100%",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "var(--text-tertiary)",
							fontSize: "0.82rem",
						}}
					>
						{t("chat.noMessages")}
					</div>
				) : (
					messages.map((message) => {
						const isMine = message.senderId === userId;
						const isHovered = hoveredMessageId === message.id;
						return (
							<div
								key={message.id}
								style={{
									marginBottom: 10,
									display: "flex",
									flexDirection: "column",
									alignItems: isMine ? "flex-end" : "flex-start",
									position: "relative",
								}}
								onMouseEnter={() => setHoveredMessageId(message.id)}
								onMouseLeave={() => setHoveredMessageId(null)}
							>
								{/* Emoji picker on hover */}
								{isHovered && (
									<div
										style={{
											display: "flex",
											gap: 2,
											marginBottom: 4,
											background: "var(--bg-tertiary)",
											border: "1px solid var(--border-subtle)",
											borderRadius: "var(--radius-md)",
											padding: "2px 4px",
											boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
										}}
									>
										{ALLOWED_EMOJIS.map((emoji) => (
											<button
												key={emoji}
												type="button"
												onClick={() => toggleReaction(message.id, emoji)}
												style={{
													border: "none",
													background: "transparent",
													cursor: "pointer",
													fontSize: "0.9rem",
													padding: "2px 4px",
													borderRadius: "var(--radius-sm)",
													lineHeight: 1,
												}}
												onMouseOver={(e) => {
													(e.currentTarget as HTMLButtonElement).style.background =
														"var(--bg-secondary)";
												}}
												onMouseOut={(e) => {
													(e.currentTarget as HTMLButtonElement).style.background = "transparent";
												}}
											>
												{emoji}
											</button>
										))}
									</div>
								)}

								<div
									style={{
										maxWidth: "85%",
										padding: "8px 10px",
										borderRadius: 10,
										background: isMine ? "var(--accent-purple)" : "var(--bg-tertiary)",
										color: isMine ? "white" : "var(--text-primary)",
									}}
								>
									<div
										style={{
											fontSize: "0.7rem",
											marginBottom: 4,
											opacity: isMine ? 0.85 : 0.7,
										}}
									>
										{isMine ? t("chat.you") : message.senderName}
									</div>
									<div style={{ fontSize: "0.82rem", lineHeight: 1.35 }}>{message.content}</div>
								</div>

								{/* Reaction pills */}
								{message.reactions.length > 0 && (
									<div
										style={{
											display: "flex",
											gap: 4,
											marginTop: 4,
											flexWrap: "wrap",
										}}
									>
										{message.reactions.map((r) => (
											<button
												key={r.emoji}
												type="button"
												onClick={() => toggleReaction(message.id, r.emoji)}
												style={{
													display: "flex",
													alignItems: "center",
													gap: 3,
													padding: "2px 6px",
													borderRadius: 999,
													border: r.reacted
														? "1px solid var(--accent-purple)"
														: "1px solid var(--border-subtle)",
													background: r.reacted ? "rgba(139, 92, 246, 0.15)" : "var(--bg-tertiary)",
													cursor: "pointer",
													fontSize: "0.72rem",
													color: "var(--text-secondary)",
													lineHeight: 1,
												}}
												title={r.userNames.join(", ")}
											>
												<span style={{ fontSize: "0.82rem" }}>{r.emoji}</span>
												<span>{r.count}</span>
											</button>
										))}
									</div>
								)}

								<div
									style={{
										fontSize: "0.68rem",
										marginTop: 3,
										color: "var(--text-tertiary)",
									}}
								>
									{new Date(message.createdAt).toLocaleTimeString([], {
										hour: "2-digit",
										minute: "2-digit",
									})}
								</div>
							</div>
						);
					})
				)}
			</div>

			<div style={{ borderTop: "1px solid var(--border-subtle)", padding: 10 }}>
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					<input
						value={input}
						onChange={(event) => setInput(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter" && !event.shiftKey) {
								event.preventDefault();
								sendMessage();
							}
						}}
						placeholder={t("chat.typeMessage")}
						style={{
							flex: 1,
							height: 36,
							padding: "0 12px",
							background: "var(--bg-tertiary)",
							border: "1px solid var(--border-subtle)",
							borderRadius: "var(--radius-md)",
							color: "var(--text-primary)",
							fontSize: "0.82rem",
						}}
					/>
					<button
						type="button"
						onClick={sendMessage}
						disabled={!canSend}
						style={{
							width: 36,
							height: 36,
							border: "none",
							borderRadius: "var(--radius-md)",
							background: canSend ? "var(--accent-purple)" : "var(--bg-tertiary)",
							color: canSend ? "white" : "var(--text-tertiary)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							cursor: canSend ? "pointer" : "not-allowed",
						}}
						aria-label={t("chat.sendMessage")}
					>
						<Send size={14} />
					</button>
				</div>
			</div>
		</div>
	);
}
