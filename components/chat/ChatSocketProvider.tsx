"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "@/lib/auth-client";

export type ChatSocketStatus = "connecting" | "open" | "closed";

type MessageListener = (data: unknown) => void;

interface ChatSocketValue {
  status: ChatSocketStatus;
  /** Subscribe the persistent socket to a meeting room. */
  joinRoom: (meetingId: string) => void;
  /** Unsubscribe from a room (only if it is the currently joined one). */
  leaveRoom: (meetingId: string) => void;
  /** Register a raw-message listener; returns an unsubscribe function. */
  addMessageListener: (listener: MessageListener) => () => void;
}

const ChatSocketContext = createContext<ChatSocketValue | null>(null);

function getChatSocketUrl() {
  if (typeof window === "undefined") return "";
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/ws/chat`;
}

const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 10_000;

/**
 * Holds a single chat WebSocket for the whole session. It is opened once the user
 * is authenticated (on page init) and kept alive across navigation — consumers
 * switch meeting rooms over it with joinRoom/leaveRoom instead of opening their
 * own connections. The connection uses the standard WebSocket upgrade handshake
 * (HTTP 101 Switching Protocols) served by server.mjs at /ws/chat.
 */
export function ChatSocketProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const isAuthenticated = Boolean(session?.user);

  const wsRef = useRef<WebSocket | null>(null);
  const currentRoomRef = useRef<string | null>(null);
  const listenersRef = useRef<Set<MessageListener>>(new Set());
  const reconnectTimerRef = useRef<number | null>(null);
  const backoffRef = useRef(BASE_BACKOFF_MS);
  const shouldConnectRef = useRef(false);
  const [status, setStatus] = useState<ChatSocketStatus>("closed");

  const clearReconnect = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!shouldConnectRef.current) return;
    const existing = wsRef.current;
    if (
      existing &&
      (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    setStatus("connecting");
    const ws = new WebSocket(getChatSocketUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      backoffRef.current = BASE_BACKOFF_MS;
      setStatus("open");
      // Re-subscribe to the active room after a (re)connect.
      if (currentRoomRef.current) {
        ws.send(JSON.stringify({ type: "join", meetingId: currentRoomRef.current }));
      }
    };

    ws.onmessage = (event) => {
      let data: unknown;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      for (const listener of listenersRef.current) {
        listener(data);
      }
    };

    ws.onclose = () => {
      if (wsRef.current === ws) wsRef.current = null;
      setStatus("closed");
      if (shouldConnectRef.current) {
        clearReconnect();
        const delay = backoffRef.current;
        reconnectTimerRef.current = window.setTimeout(connect, delay);
        backoffRef.current = Math.min(delay * 1.5, MAX_BACKOFF_MS);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [clearReconnect]);

  // Open on authentication (page init); tear down on logout / unmount.
  useEffect(() => {
    if (!isAuthenticated) {
      shouldConnectRef.current = false;
      clearReconnect();
      currentRoomRef.current = null;
      wsRef.current?.close();
      wsRef.current = null;
      setStatus("closed");
      return;
    }

    shouldConnectRef.current = true;
    backoffRef.current = BASE_BACKOFF_MS;
    connect();

    return () => {
      shouldConnectRef.current = false;
      clearReconnect();
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [isAuthenticated, connect, clearReconnect]);

  const joinRoom = useCallback((meetingId: string) => {
    currentRoomRef.current = meetingId;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "join", meetingId }));
    }
    // Otherwise the room is re-sent automatically once the socket opens.
  }, []);

  const leaveRoom = useCallback((meetingId: string) => {
    if (currentRoomRef.current !== meetingId) return;
    currentRoomRef.current = null;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "leave", meetingId }));
    }
  }, []);

  const addMessageListener = useCallback((listener: MessageListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const value = useMemo<ChatSocketValue>(
    () => ({ status, joinRoom, leaveRoom, addMessageListener }),
    [status, joinRoom, leaveRoom, addMessageListener],
  );

  return <ChatSocketContext.Provider value={value}>{children}</ChatSocketContext.Provider>;
}

export function useChatSocket(): ChatSocketValue {
  const ctx = useContext(ChatSocketContext);
  if (!ctx) {
    throw new Error("useChatSocket must be used within a ChatSocketProvider");
  }
  return ctx;
}
