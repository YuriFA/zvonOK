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
}

export function ChatPanel({
  messages,
  currentUserId,
  className,
  isLoading,
  hasMore,
  onSendMessage,
  onLoadMore,
}: ChatPanelProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <MessageList
        messages={messages}
        currentUserId={currentUserId ?? ""}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
      />
      <MessageInput onSend={onSendMessage} />
    </div>
  );
}
