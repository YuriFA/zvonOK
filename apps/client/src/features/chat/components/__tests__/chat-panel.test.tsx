import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Message } from "../../types/chat.types";
import { ChatPanel } from "../chat-panel";

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "m1",
    content: "Hello",
    userId: "u1",
    roomId: "r1",
    createdAt: "2026-01-01T10:30:00Z",
    user: { id: "u1", username: "Alice" },
    ...overrides,
  };
}

describe("ChatPanel", () => {
  const onClose = vi.fn();
  const onSendMessage = vi.fn();

  let defaultProps: {
    messages: Message[];
    currentUserId: string;
    isOpen: boolean;
    onSendMessage: (content: string) => Promise<void>;
    onClose: () => void;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps = {
      messages: [],
      currentUserId: "u1",
      isOpen: true,
      onSendMessage,
      onClose,
    };
  });

  it("renders message input when open", () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByLabelText("Chat message input")).toBeInTheDocument();
  });

  it("renders messages when provided", () => {
    const messages = [makeMessage(), makeMessage({ id: "m2", content: "World" })];
    render(<ChatPanel {...defaultProps} messages={messages} />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("World")).toBeInTheDocument();
  });

  it("shows load earlier button when hasMore is true with messages", () => {
    const onLoadMore = vi.fn();
    render(
      <ChatPanel
        {...defaultProps}
        messages={[makeMessage()]}
        hasMore={true}
        onLoadMore={onLoadMore}
      />,
    );
    expect(screen.getByText("Load earlier messages")).toBeInTheDocument();
  });

  it("does not show load earlier button when hasMore is false", () => {
    render(<ChatPanel {...defaultProps} messages={[makeMessage()]} hasMore={false} />);
    expect(screen.queryByText("Load earlier messages")).not.toBeInTheDocument();
  });
});
