import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import { toast } from "sonner";

import type { Message } from "../types/chat.types";

const SOCKET_URL =
  (import.meta.env as { VITE_SOCKET_URL?: string }).VITE_SOCKET_URL ?? "http://localhost:3000";

interface UseChatOptions {
  roomId: string;
  currentUserId: string | undefined;
  enabled?: boolean;
}

interface UseChatReturn {
  messages: Message[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;
  sendMessage: (content: string) => Promise<void>;
  loadHistory: () => void;
  resetUnreadCount: () => void;
}

export function useChat({ roomId, currentUserId, enabled = true }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const currentPageRef = useRef(1);

  useEffect(() => {
    if (!enabled || !roomId) return;

    const socket = io(`${SOCKET_URL}/chat`, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      currentPageRef.current = 1;
      socket.emit(
        "chat:history",
        { roomId, page: 1 },
        (response: { data: Message[]; meta: { totalPages: number; page: number } }) => {
          if (response?.data) {
            setMessages(response.data);
            setHasMore(response.meta.page < response.meta.totalPages);
          }
        },
      );
    });

    socket.on("chat:message", (message: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });

      if (message.userId !== currentUserId) {
        setUnreadCount((c) => c + 1);
      }
    });

    socket.on("chat:error", ({ message }: { event: string; message: string }) => {
      toast.error(message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, roomId, currentUserId]);

  const sendMessage = useCallback(
    async (content: string) => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        throw new Error("Chat is not connected");
      }
      socket.emit("chat:send", { content, roomId });
    },
    [roomId],
  );

  const loadHistory = useCallback(() => {
    setIsLoading(true);
    const socket = socketRef.current;
    if (!socket?.connected) {
      setIsLoading(false);
      return;
    }
    const nextPage = currentPageRef.current + 1;
    socket.emit(
      "chat:history",
      { roomId, page: nextPage },
      (response: { data: Message[]; meta: { totalPages: number; page: number } }) => {
        if (response?.data) {
          currentPageRef.current = nextPage;
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMessages = response.data.filter((m) => !existingIds.has(m.id));
            return [...newMessages, ...prev];
          });
          setHasMore(response.meta.page < response.meta.totalPages);
        }
        setIsLoading(false);
      },
    );
  }, [roomId]);

  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return {
    messages,
    unreadCount,
    isLoading,
    hasMore,
    sendMessage,
    loadHistory,
    resetUnreadCount,
  };
}
