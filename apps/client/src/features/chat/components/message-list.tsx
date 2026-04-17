import { useCallback, useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

import type { Message } from "../types/chat.types";
import { MessageBubble } from "./message-bubble";

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

const AUTO_SCROLL_THRESHOLD = 100;

function shouldShowHeader(messages: Message[], index: number): boolean {
  if (index === 0) return true;
  const current = messages[index];
  const previous = messages[index - 1];
  if (current.userId !== previous.userId) return true;
  const timeDiff = new Date(current.createdAt).getTime() - new Date(previous.createdAt).getTime();
  return timeDiff > 5 * 60 * 1000;
}

export function MessageList({
  messages,
  currentUserId,
  isLoading,
  hasMore,
  onLoadMore,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevCountRef = useRef(0);

  const checkNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < AUTO_SCROLL_THRESHOLD;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    isNearBottomRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (messages.length === prevCountRef.current) return;
    prevCountRef.current = messages.length;
    if (!isNearBottomRef.current) return;
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  const sortedMessages = [...messages].reverse();

  return (
    <div
      ref={containerRef}
      onScroll={checkNearBottom}
      className={cn("flex flex-col gap-2 overflow-y-auto py-3", isLoading && "animate-pulse")}
    >
      {hasMore && onLoadMore && (
        <button
          type="button"
          onClick={onLoadMore}
          className="mx-auto rounded-md px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Load earlier messages
        </button>
      )}
      {isLoading && (
        <p className="text-center text-xs text-muted-foreground">Loading messages...</p>
      )}
      {!isLoading && sortedMessages.length === 0 && (
        <p className="text-center text-xs text-muted-foreground">No messages yet</p>
      )}
      {sortedMessages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          isOwn={message.userId === currentUserId}
          showHeader={shouldShowHeader(sortedMessages, index)}
        />
      ))}
    </div>
  );
}
