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
  let onClose: ReturnType<typeof vi.fn>;
  let onSendMessage: ReturnType<typeof vi.fn>;
  let defaultProps: {
    messages: Message[];
    currentUserId: string;
    isOpen: boolean;
    onSendMessage: (content: string) => Promise<void>;
    onClose: () => void;
  };

  beforeEach(() => {
    onClose = vi.fn();
    onSendMessage = vi.fn().mockResolvedValue(undefined);
    defaultProps = {
      messages: [],
      currentUserId: "u1",
      isOpen: true,
      onSendMessage,
      onClose,
    };
  });

  it("renders chat header when open", () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText("Chat")).toBeInTheDocument();
  });

  it("renders close button when open", () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByLabelText("Close chat")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    render(<ChatPanel {...defaultProps} />);
    screen.getByLabelText("Close chat").click();
    expect(onClose).toHaveBeenCalledOnce();
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

  it("has mobile overlay and desktop sidebar classes when open", () => {
    const { container } = render(<ChatPanel {...defaultProps} />);
    const aside = container.querySelector("aside") as HTMLElement;
    expect(aside.className).toContain("absolute");
    expect(aside.className).toContain("z-50");
    expect(aside.className).toContain("w-full");
    expect(aside.className).toContain("md:relative");
    expect(aside.className).toContain("md:w-80");
    expect(aside.className).toContain("md:border-l");
  });

  it("has w-0 class when closed", () => {
    const { container } = render(<ChatPanel {...defaultProps} isOpen={false} />);
    const aside = container.querySelector("aside") as HTMLElement;
    expect(aside.className).toContain("w-0");
    expect(aside.className).not.toContain("z-50");
    expect(aside.className).not.toContain("absolute");
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
