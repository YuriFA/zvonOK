import { SendHorizontal } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const DEFAULT_MAX_LENGTH = 500;

interface MessageInputProps {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
  maxLength?: number;
  placeholder?: string;
}

export function MessageInput({
  onSend,
  disabled = false,
  isLoading = false,
  maxLength = DEFAULT_MAX_LENGTH,
  placeholder = "Type a message...",
}: MessageInputProps) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charCount = value.length;
  const isOverLimit = charCount > maxLength;

  const canSend = value.trim().length > 0 && !sending && !disabled && !isLoading;

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || sending || disabled || charCount > maxLength) return;

    setSending(true);
    try {
      await onSend(trimmed);
      setValue("");
    } catch {
      setValue(trimmed);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }, [value, sending, disabled, charCount, maxLength, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div className="flex flex-col gap-1 border-t px-3 pt-2 pb-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || sending}
          maxLength={maxLength + 100}
          rows={1}
          aria-label="Chat message input"
          className="max-h-24 min-h-[36px] flex-1 resize-none rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={handleSubmit}
          disabled={!canSend || isOverLimit}
          aria-label="Send message"
        >
          <SendHorizontal className="size-4" />
        </Button>
      </div>
      <div className="flex justify-end">
        <span className={`text-xs ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
          {charCount}/{maxLength}
        </span>
      </div>
    </div>
  );
}
