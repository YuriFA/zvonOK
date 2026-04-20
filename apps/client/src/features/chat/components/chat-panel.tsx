import { MessageSquare, X } from "lucide-react";

import { cn } from "@/lib/utils";

import type { Message } from "../types/chat.types";
import { MessageInput } from "./message-input";
import { MessageList } from "./message-list";

interface ChatPanelProps {
  messages: Message[];
  currentUserId: string | undefined;
  className?: string;
  isLoading?: boolean;
  hasMore?: boolean;
  onSendMessage: (content: string) => Promise<void>;
  onLoadMore?: () => void;
  onClose: () => void;
}

export function ChatPanel({
  messages,
  currentUserId,
  className,
  isLoading,
  hasMore,
  onSendMessage,
  onLoadMore,
  onClose,
}: ChatPanelProps) {
  return (
    <div className={cn("flex flex-col rounded-lg border bg-card", className)}>
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MessageSquare className="size-4" />
          Chat
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-sm p-1 text-muted-foreground hover:text-foreground"
          aria-label="Close chat"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <MessageList
          messages={messages}
          currentUserId={currentUserId ?? ""}
          isLoading={isLoading}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
        />
        <MessageInput onSend={onSendMessage} />
      </div>
    </div>
  );
}
