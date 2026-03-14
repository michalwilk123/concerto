import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, spacing, radius } from "@/constants/theme";
import { meetingsApi, BASE_URL } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { ChatMessage } from "@/lib/types";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "👏"];
const WS_RECONNECT_DELAY = 1200;

interface ChatPanelProps {
  meetingId: string;
  authToken: string;
}

export function ChatPanel({ meetingId, authToken }: ChatPanelProps) {
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [reactionTarget, setReactionTarget] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mountedRef = useRef(true);

  // Load chat history
  useEffect(() => {
    meetingsApi.chatHistory(meetingId).then((history) => {
      if (mountedRef.current) {
        setMessages(history);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
      }
    }).catch(() => {});
  }, [meetingId]);

  // WebSocket connection
  const connectWs = useCallback(() => {
    if (!mountedRef.current) return;

    const wsProtocol = BASE_URL.startsWith("https") ? "wss" : "ws";
    const wsHost = BASE_URL.replace(/^https?:\/\//, "");
    const ws = new WebSocket(
      `${wsProtocol}://${wsHost}/ws/chat?token=${encodeURIComponent(authToken)}`
    );

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", meetingId }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "reaction_update") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === data.messageId ? { ...m, reactions: data.reactions } : m
            )
          );
          return;
        }

        // New message — deduplicate by id
        if (data.id && data.content) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.id)) return prev;
            return [...prev, data as ChatMessage];
          });
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
        }
      } catch {}
    };

    ws.onclose = () => {
      if (mountedRef.current) {
        reconnectTimer.current = setTimeout(connectWs, WS_RECONNECT_DELAY);
      }
    };

    ws.onerror = () => ws.close();

    wsRef.current = ws;
  }, [meetingId, authToken]);

  useEffect(() => {
    connectWs();
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connectWs]);

  // Reconnect on app foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) {
        connectWs();
      }
    });
    return () => sub.remove();
  }, [connectWs]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      await meetingsApi.sendChat(meetingId, text);
    } catch {}
    setSending(false);
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    setReactionTarget(null);
    try {
      const result = await meetingsApi.toggleReaction(messageId, emoji);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, reactions: result.reactions } : m
        )
      );
    } catch {}
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const isOwnMessage = (msg: ChatMessage) => msg.senderId === user?.id;

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const own = isOwnMessage(item);
    return (
      <View style={styles.messageWrapper}>
        <Pressable
          onLongPress={() => setReactionTarget(item.id)}
          style={[styles.messageBubble, own ? styles.ownBubble : styles.otherBubble]}
        >
          {!own && <Text style={styles.senderName}>{item.senderName}</Text>}
          <Text style={styles.messageText}>{item.content}</Text>
          <Text style={styles.messageTime}>{formatTime(item.createdAt)}</Text>
        </Pressable>

        {/* Reaction pills */}
        {item.reactions.length > 0 && (
          <View style={[styles.reactionsRow, own && styles.reactionsRowOwn]}>
            {item.reactions.map((r) => (
              <Pressable
                key={r.emoji}
                style={[styles.reactionPill, r.reacted && styles.reactionPillActive]}
                onPress={() => handleReaction(item.id, r.emoji)}
              >
                <Text style={styles.reactionEmoji}>
                  {r.emoji} {r.count}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Emoji picker */}
        {reactionTarget === item.id && (
          <View style={[styles.emojiPicker, own && styles.emojiPickerOwn]}>
            {EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                style={styles.emojiButton}
                onPress={() => handleReaction(item.id, emoji)}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Dismiss reaction picker on tap */}
      <Pressable
        style={styles.listContainer}
        onPress={() => setReactionTarget(null)}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
        />
      </Pressable>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          placeholderTextColor={colors.textTertiary}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit
        />
        <Pressable
          style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || sending}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  messageWrapper: {
    marginBottom: spacing.md,
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
  },
  ownBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.accentPurple,
    borderBottomRightRadius: radius.sm,
  },
  otherBubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.bgTertiary,
    borderBottomLeftRadius: radius.sm,
  },
  senderName: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    color: "rgba(139, 92, 246, 0.9)",
    marginBottom: 2,
  },
  messageText: {
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
    color: colors.textPrimary,
    lineHeight: 21,
  },
  messageTime: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: "rgba(255, 255, 255, 0.4)",
    alignSelf: "flex-end",
    marginTop: 2,
  },
  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
    paddingLeft: spacing.xs,
  },
  reactionsRowOwn: {
    justifyContent: "flex-end",
    paddingLeft: 0,
    paddingRight: spacing.xs,
  },
  reactionPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgTertiary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "transparent",
  },
  reactionPillActive: {
    borderColor: "rgba(139, 92, 246, 0.5)",
    backgroundColor: "rgba(139, 92, 246, 0.15)",
  },
  reactionEmoji: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  emojiPicker: {
    flexDirection: "row",
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.borderMedium,
    gap: 2,
  },
  emojiPickerOwn: {
    alignSelf: "flex-end",
  },
  emojiButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  emojiText: {
    fontSize: 20,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.bgSecondary,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === "ios" ? spacing.sm : spacing.xs,
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
    color: colors.textPrimary,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  sendButton: {
    backgroundColor: colors.accentPurple,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    justifyContent: "center",
    minHeight: 36,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: "#fff",
  },
});
