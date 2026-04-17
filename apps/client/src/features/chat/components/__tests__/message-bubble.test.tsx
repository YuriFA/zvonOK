import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Message } from "../../types/chat.types";
import { MessageBubble } from "../message-bubble";

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

describe("MessageBubble", () => {
  it("renders message content", () => {
    render(<MessageBubble message={makeMessage()} isOwn={false} showHeader={true} />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("shows username and time when showHeader is true", () => {
    render(<MessageBubble message={makeMessage()} isOwn={false} showHeader={true} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    const timeEl = screen.getByText(/\d{1,2}:\d{2}/);
    expect(timeEl).toBeInTheDocument();
  });

  it("hides username and time when showHeader is false", () => {
    render(<MessageBubble message={makeMessage()} isOwn={false} showHeader={false} />);
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("aligns own messages to the right", () => {
    const { container } = render(
      <MessageBubble message={makeMessage()} isOwn={true} showHeader={true} />,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("items-end");
  });

  it("aligns other messages to the left", () => {
    const { container } = render(
      <MessageBubble message={makeMessage()} isOwn={false} showHeader={true} />,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("items-start");
  });

  it("uses primary background for own messages", () => {
    const { container } = render(
      <MessageBubble message={makeMessage()} isOwn={true} showHeader={false} />,
    );
    const bubble = container.querySelector(".bg-primary");
    expect(bubble).toBeInTheDocument();
  });

  it("uses muted background for other messages", () => {
    const { container } = render(
      <MessageBubble message={makeMessage()} isOwn={false} showHeader={false} />,
    );
    const bubble = container.querySelector(".bg-muted");
    expect(bubble).toBeInTheDocument();
  });
});
