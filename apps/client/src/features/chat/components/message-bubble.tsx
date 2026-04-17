import { cn } from "@/lib/utils";

import type { Message } from "../types/chat.types";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showHeader: boolean;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({ message, isOwn, showHeader }: MessageBubbleProps) {
  return (
    <div className={cn("flex flex-col gap-0.5 px-3", isOwn ? "items-end" : "items-start")}>
      {showHeader && (
        <div
          className={cn(
            "flex items-center gap-2 text-xs text-muted-foreground",
            isOwn && "flex-row-reverse",
          )}
        >
          <span className="font-medium text-foreground">{message.user.username}</span>
          <span>{formatTime(message.createdAt)}</span>
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
          isOwn
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted text-foreground",
        )}
      >
        <p className="break-words whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
