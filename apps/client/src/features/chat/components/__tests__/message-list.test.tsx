import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Message } from "../../types/chat.types";
import { MessageList } from "../message-list";

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

const baseMessages: Message[] = [
  makeMessage({ id: "m1", content: "Hi there", userId: "u1", createdAt: "2026-01-01T10:30:00Z" }),
  makeMessage({ id: "m2", content: "Hey!", userId: "u2", createdAt: "2026-01-01T10:31:00Z" }),
  makeMessage({
    id: "m3",
    content: "How are you?",
    userId: "u1",
    createdAt: "2026-01-01T10:32:00Z",
  }),
];

describe("MessageList", () => {
  it("renders all messages", () => {
    render(<MessageList messages={baseMessages} currentUserId="u1" />);
    expect(screen.getByText("Hi there")).toBeInTheDocument();
    expect(screen.getByText("Hey!")).toBeInTheDocument();
    expect(screen.getByText("How are you?")).toBeInTheDocument();
  });

  it("shows empty state when no messages and not loading", () => {
    render(<MessageList messages={[]} currentUserId="u1" />);
    expect(screen.getByText("No messages yet")).toBeInTheDocument();
  });

  it("shows skeleton when loading with no messages", () => {
    const { container } = render(<MessageList messages={[]} currentUserId="u1" isLoading={true} />);
    expect(container.querySelector("[aria-busy='true']")).toBeInTheDocument();
    expect(screen.queryByText("No messages yet")).not.toBeInTheDocument();
  });

  it("shows load more button when hasMore is true and onLoadMore provided", () => {
    const onLoadMore = vi.fn();
    render(
      <MessageList
        messages={baseMessages}
        currentUserId="u1"
        hasMore={true}
        onLoadMore={onLoadMore}
      />,
    );
    const btn = screen.getByRole("button", { name: /load earlier/i });
    expect(btn).toBeInTheDocument();
  });

  it("does not show load more button when hasMore is false", () => {
    render(<MessageList messages={baseMessages} currentUserId="u1" hasMore={false} />);
    expect(screen.queryByRole("button", { name: /load earlier/i })).not.toBeInTheDocument();
  });

  it("calls onLoadMore when load more button is clicked", () => {
    const onLoadMore = vi.fn();
    render(
      <MessageList
        messages={baseMessages}
        currentUserId="u1"
        hasMore={true}
        onLoadMore={onLoadMore}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /load earlier/i }));
    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it("groups consecutive messages from the same sender", () => {
    const sameSenderMessages: Message[] = [
      makeMessage({ id: "m1", content: "First", userId: "u1", createdAt: "2026-01-01T10:30:00Z" }),
      makeMessage({ id: "m2", content: "Second", userId: "u1", createdAt: "2026-01-01T10:30:30Z" }),
    ];
    render(<MessageList messages={sameSenderMessages} currentUserId="u2" />);

    const usernames = screen.getAllByText("Alice");
    expect(usernames).toHaveLength(1);
  });

  it("shows header for messages from different senders", () => {
    const differentSenderMessages: Message[] = [
      makeMessage({
        id: "m1",
        content: "From Alice",
        userId: "u1",
        user: { id: "u1", username: "Alice" },
        createdAt: "2026-01-01T10:30:00Z",
      }),
      makeMessage({
        id: "m2",
        content: "From Bob",
        userId: "u2",
        user: { id: "u2", username: "Bob" },
        createdAt: "2026-01-01T10:31:00Z",
      }),
    ];
    render(<MessageList messages={differentSenderMessages} currentUserId="u3" />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows header when time gap exceeds 5 minutes", () => {
    const timeGapMessages: Message[] = [
      makeMessage({ id: "m1", content: "Later", userId: "u1", createdAt: "2026-01-01T10:40:00Z" }),
      makeMessage({
        id: "m2",
        content: "Earlier",
        userId: "u1",
        createdAt: "2026-01-01T10:30:00Z",
      }),
    ];
    render(<MessageList messages={timeGapMessages} currentUserId="u2" />);

    const usernames = screen.getAllByText("Alice");
    expect(usernames).toHaveLength(2);
  });

  it("renders messages oldest first in the DOM", () => {
    const newestFirst: Message[] = [
      makeMessage({
        id: "m3",
        content: "How are you?",
        userId: "u1",
        createdAt: "2026-01-01T10:32:00Z",
      }),
      makeMessage({ id: "m2", content: "Hey!", userId: "u2", createdAt: "2026-01-01T10:31:00Z" }),
      makeMessage({
        id: "m1",
        content: "Hi there",
        userId: "u1",
        createdAt: "2026-01-01T10:30:00Z",
      }),
    ];
    const { container } = render(<MessageList messages={newestFirst} currentUserId="u1" />);
    const messageEls = container.querySelectorAll("[class*='break-words']");
    expect(messageEls[0]).toHaveTextContent("Hi there");
    expect(messageEls[1]).toHaveTextContent("Hey!");
    expect(messageEls[2]).toHaveTextContent("How are you?");
  });
});
