"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useToast } from "@/components/Toast";
import { useTranslation } from "@/hooks/useTranslation";
import { chatApi } from "@/lib/api-client";
import type { ChatMessage } from "@/types/chat";
import { useChatSocket } from "./ChatSocketProvider";

interface ChatContextValue {
  messages: ChatMessage[];
  isLoadingHistory: boolean;
  sendMessage: (content: string) => Promise<ChatMessage>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

/**
 * Hosts the meeting chat connection (WebSocket) + history at the meeting level so
 * it is established in the background as soon as the meeting opens, independent of
 * whether the chat tab/sidebar is open. Mounted in VideoRoom, which stays mounted
 * for the whole meeting — so the connection survives sidebar/tab open-close.
 */
export function ChatProvider({
  meetingId,
  participantName,
  children,
}: {
  meetingId: string;
  participantName?: string;
  children: ReactNode;
}) {
  const toast = useToast();
  const { t } = useTranslation();
  const { joinRoom, leaveRoom, addMessageListener } = useChatSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Load history
  useEffect(() => {
    if (!meetingId) return;
    let mounted = true;

    chatApi
      .list(meetingId, 100, { participantName })
      .then((history) => {
        if (!mounted) return;
        setMessages(history);
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
  }, [meetingId, participantName, t, toast]);

  // Join this meeting's room on the shared, app-level socket and listen for its
  // messages. The connection itself is owned by ChatSocketProvider (opened on
  // page init and kept alive), so leaving the meeting only unsubscribes — it
  // does not close the socket.
  useEffect(() => {
    if (!meetingId) return;

    joinRoom(meetingId);

    const remove = addMessageListener((data) => {
      const msg = data as {
        type?: string;
        messageId?: string;
        reactions?: ChatMessage["reactions"];
      } & Partial<ChatMessage>;

      if (msg.type === "reaction_update") {
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.messageId ? { ...m, reactions: msg.reactions ?? [] } : m)),
        );
        return;
      }

      // Regular chat message — ignore anything not for this room.
      if (!msg.id || msg.meetingId !== meetingId) return;
      const incoming = msg as ChatMessage;
      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return [...prev, incoming];
      });
    });

    return () => {
      remove();
      leaveRoom(meetingId);
    };
  }, [meetingId, joinRoom, leaveRoom, addMessageListener]);

  const sendMessage = useCallback(
    async (content: string) => {
      const created = await chatApi.create({ content, meetingId });
      setMessages((prev) => {
        if (prev.some((m) => m.id === created.id)) return prev;
        return [...prev, created];
      });
      return created;
    },
    [meetingId],
  );

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    const { reactions } = await chatApi.toggleReaction({ messageId, emoji });
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)));
  }, []);

  const value = useMemo<ChatContextValue>(
    () => ({ messages, isLoadingHistory, sendMessage, toggleReaction }),
    [messages, isLoadingHistory, sendMessage, toggleReaction],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return ctx;
}
