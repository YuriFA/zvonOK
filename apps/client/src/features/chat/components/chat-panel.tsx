import { MessageSquare } from "lucide-react";

import { cn } from "@/lib/utils";

import type { Message } from "../types/chat.types";
import { MessageInput } from "./message-input";
import { MessageList } from "./message-list";

interface ChatPanelProps {
  messages: Message[];
  currentUserId: string | undefined;
  isOpen: boolean;
  isLoading?: boolean;
  hasMore?: boolean;
  onSendMessage: (content: string) => Promise<void>;
  onLoadMore?: () => void;
  onClose: () => void;
}

export function ChatPanel({
  messages,
  currentUserId,
  isOpen,
  isLoading,
  hasMore,
  onSendMessage,
  onLoadMore,
  onClose,
}: ChatPanelProps) {
  return (
    <aside
      className={cn(
        "flex flex-col overflow-hidden bg-background transition-all duration-300 ease-in-out",
        isOpen ? "absolute inset-0 z-50 w-full md:relative md:z-auto md:w-80 md:border-l" : "w-0",
      )}
    >
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
          &times;
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
    </aside>
  );
}
