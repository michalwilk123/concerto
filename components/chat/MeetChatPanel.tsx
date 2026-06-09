"use client";

import { Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import { LoadingIndicator } from "@/components/ui/loading-state";
import { useTranslation } from "@/hooks/useTranslation";
import { useSession } from "@/lib/auth-client";
import { useChat } from "./ChatProvider";

const ALLOWED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "👏"];

export function MeetChatPanel() {
  const toast = useToast();
  const { t } = useTranslation();
  const { data: session } = useSession();
  // Chat connection + history live in ChatProvider (mounted at meeting level) so
  // they persist across sidebar/tab open-close; this panel is purely presentational.
  const {
    messages,
    isLoadingHistory,
    sendMessage: sendChatMessage,
    toggleReaction: toggleChatReaction,
  } = useChat();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }, []);

  const userId = session?.user.id ?? null;
  const isReadOnly = !session;

  // Keep the view pinned to the latest message (history + live updates).
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const canSend = useMemo(
    () => !isReadOnly && input.trim().length > 0 && !isSending,
    [isReadOnly, input, isSending],
  );

  const sendMessage = async () => {
    if (!canSend) return;
    setIsSending(true);
    const content = input.trim();
    setInput("");

    try {
      await sendChatMessage(content);
      scrollToBottom();
    } catch (error) {
      setInput(content);
      toast.error(error instanceof Error ? error.message : t("chat.sendFailed"));
    } finally {
      setIsSending(false);
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (isReadOnly) return;
    try {
      await toggleChatReaction(messageId, emoji);
    } catch {
      // WS will update the state
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        width: "100%",
      }}
    >
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
                {isHovered && !isReadOnly && (
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
                        disabled={isReadOnly}
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
                          cursor: isReadOnly ? "default" : "pointer",
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
        {isReadOnly && (
          <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginBottom: 8 }}>
            {t("chat.readOnlyGuest")}
          </div>
        )}
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
            disabled={isReadOnly}
            style={{
              flex: 1,
              height: 36,
              padding: "0 12px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
              fontSize: "0.82rem",
              opacity: isReadOnly ? 0.7 : 1,
            }}
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!canSend}
            style={{
              width: 36,
              height: 36,
              minWidth: 36,
              padding: 0,
              border: "none",
              borderRadius: "var(--radius-md)",
              background: canSend ? "var(--accent-purple)" : "var(--bg-tertiary)",
              color: canSend ? "white" : "var(--text-tertiary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 0,
              cursor: canSend ? "pointer" : "not-allowed",
            }}
            aria-label={t("chat.sendMessage")}
          >
            <Send size={18} style={{ width: 18, height: 18, display: "block", flexShrink: 0 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
