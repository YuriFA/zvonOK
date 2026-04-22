import { fireEvent, render, screen, cleanup, waitFor, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MessageInput } from "../message-input";

describe("MessageInput", () => {
  const onSend = vi.fn<(content: string) => Promise<void>>();

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  async function typeInInput(value: string) {
    fireEvent.change(screen.getByLabelText("Chat message input"), { target: { value } });
  }

  it("renders textarea and send button", () => {
    render(<MessageInput onSend={onSend} />);
    expect(screen.getByLabelText("Chat message input")).toBeInTheDocument();
    expect(screen.getByLabelText("Send message")).toBeInTheDocument();
  });

  it("uses default placeholder", () => {
    render(<MessageInput onSend={onSend} />);
    expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
  });

  it("uses custom placeholder", () => {
    render(<MessageInput onSend={onSend} placeholder="Say something..." />);
    expect(screen.getByPlaceholderText("Say something...")).toBeInTheDocument();
  });

  it("disables send button when input is empty", () => {
    render(<MessageInput onSend={onSend} />);
    expect(screen.getByLabelText("Send message")).toBeDisabled();
  });

  it("disables send button for whitespace-only input", () => {
    render(<MessageInput onSend={onSend} />);
    typeInInput("   ");
    expect(screen.getByLabelText("Send message")).toBeDisabled();
  });

  it("enables send button when input has content", () => {
    render(<MessageInput onSend={onSend} />);
    typeInInput("Hello");
    expect(screen.getByLabelText("Send message")).not.toBeDisabled();
  });

  it("sends trimmed message on button click", async () => {
    render(<MessageInput onSend={onSend} />);
    typeInInput("  Hello  ");
    fireEvent.click(screen.getByLabelText("Send message"));
    await waitFor(() => {
      expect(onSend).toHaveBeenCalledWith("Hello");
    });
  });

  it("clears input after successful send", async () => {
    render(<MessageInput onSend={onSend} />);
    const textarea = screen.getByLabelText("Chat message input");
    typeInInput("Hello");
    fireEvent.click(screen.getByLabelText("Send message"));
    await waitFor(() => {
      expect(textarea).toHaveValue("");
    });
  });

  it("sends on Enter key", async () => {
    render(<MessageInput onSend={onSend} />);
    const textarea = screen.getByLabelText("Chat message input");
    typeInInput("Hello");
    fireEvent.keyDown(textarea, { key: "Enter" });
    await waitFor(() => {
      expect(onSend).toHaveBeenCalledWith("Hello");
    });
  });

  it("does not send on Shift+Enter", () => {
    render(<MessageInput onSend={onSend} />);
    const textarea = screen.getByLabelText("Chat message input");
    typeInInput("Hello");
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("disables send button when over character limit", () => {
    render(<MessageInput onSend={onSend} maxLength={5} />);
    typeInInput("123456");
    expect(screen.getByLabelText("Send message")).toBeDisabled();
  });

  it("disables input and button when disabled prop is true", () => {
    render(<MessageInput onSend={onSend} disabled={true} />);
    expect(screen.getByLabelText("Chat message input")).toBeDisabled();
    expect(screen.getByLabelText("Send message")).toBeDisabled();
  });

  it("restores message on send error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    onSend.mockRejectedValueOnce(new Error("Network error"));
    render(<MessageInput onSend={onSend} />);
    const textarea = screen.getByLabelText("Chat message input");
    typeInInput("Hello");
    fireEvent.click(screen.getByLabelText("Send message"));
    await waitFor(() => {
      expect(textarea).toHaveValue("Hello");
    });
    consoleSpy.mockRestore();
  });

  it("does not send while already sending", async () => {
    render(<MessageInput onSend={onSend} />);
    typeInInput("Hello");
    fireEvent.click(screen.getByLabelText("Send message"));
    await waitFor(() => {
      expect(onSend).toHaveBeenCalledOnce();
    });
    expect(screen.getByLabelText("Send message")).toBeDisabled();
  });

  it("returns focus to textarea after send", async () => {
    render(<MessageInput onSend={onSend} />);
    const textarea = screen.getByLabelText("Chat message input");
    const focusSpy = vi.spyOn(textarea, "focus");

    act(() => {
      typeInInput("Hello jfkdjfkd");
      fireEvent.click(screen.getByLabelText("Send message"));
    });

    await waitFor(() => {
      expect(onSend).toHaveBeenCalled();
    });
    expect(focusSpy).toHaveBeenCalled();
  });
});
