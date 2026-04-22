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

function MessageSkeleton() {
  const rows = [
    { align: "start", header: true, width: "w-48" },
    { align: "start", header: false, width: "w-64" },
    { align: "end", header: true, width: "w-40" },
    { align: "end", header: false, width: "w-56" },
    { align: "start", header: true, width: "w-52" },
  ];

  return (
    <div className="flex animate-pulse flex-col gap-2 px-3 py-3" aria-busy="true">
      {rows.map((row) => (
        <div
          key={`${row.align}-${row.header}-${row.width}`}
          className={cn("flex flex-col gap-1", row.align === "end" ? "items-end" : "items-start")}
        >
          {row.header && <div className="h-3 w-20 rounded bg-muted-foreground/20" />}
          <div className={cn("h-7 rounded-2xl bg-muted-foreground/15", row.width)} />
        </div>
      ))}
    </div>
  );
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

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto">
        <MessageSkeleton />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={checkNearBottom}
      className="flex flex-1 flex-col gap-2 overflow-y-auto py-3"
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
      {!isLoading && messages.length === 0 && (
        <p className="text-center text-xs text-muted-foreground">No messages yet</p>
      )}
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          isOwn={message.userId === currentUserId}
          showHeader={shouldShowHeader(messages, index)}
        />
      ))}
    </div>
  );
}
