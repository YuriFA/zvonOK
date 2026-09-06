import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WhiteboardPanel } from "../components/whiteboard-panel";

vi.mock("tldraw", () => ({
  Tldraw: () => <div data-testid="tldraw-canvas" />,
}));

const baseProps = {
  status: "open" as const,
  isOwner: false,
  onEditorMount: vi.fn(),
  onToggleMode: vi.fn(),
  onClose: vi.fn(),
};

describe("WhiteboardPanel", () => {
  it("shows the draw-lock status and the owner toggle to the owner", () => {
    render(<WhiteboardPanel {...baseProps} mode="owner" isOwner />);

    expect(screen.getByText("Host-only drawing")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open drawing/i })).toBeInTheDocument();
  });

  it("hides the toggle from non-owners but keeps the status visible", () => {
    render(<WhiteboardPanel {...baseProps} mode="owner" isOwner={false} />);

    expect(screen.getByText("Host-only drawing")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /open drawing/i })).not.toBeInTheDocument();
  });

  it("toggles between owner-only and open drawing", () => {
    const onToggleMode = vi.fn();
    const { rerender } = render(
      <WhiteboardPanel {...baseProps} mode="owner" isOwner onToggleMode={onToggleMode} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /open drawing/i }));
    expect(onToggleMode).toHaveBeenCalledWith("open");

    rerender(<WhiteboardPanel {...baseProps} mode="open" isOwner onToggleMode={onToggleMode} />);
    expect(screen.getByText("Drawing open")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /lock drawing/i }));
    expect(onToggleMode).toHaveBeenCalledWith("owner");
  });

  it("marks the canvas read-only for a locked non-owner and editable when open", async () => {
    const { rerender } = render(<WhiteboardPanel {...baseProps} mode="owner" isOwner={false} />);
    const canvas = await screen.findByTestId("tldraw-canvas");
    expect(canvas.parentElement).toHaveAttribute("data-readonly", "true");

    rerender(<WhiteboardPanel {...baseProps} mode="open" isOwner={false} />);
    expect(canvas.parentElement).toHaveAttribute("data-readonly", "false");
  });
  it("shows an unavailable notice when the board errors", () => {
    render(<WhiteboardPanel {...baseProps} mode="owner" status="error" />);

    expect(screen.getByText(/board is unavailable/i)).toBeInTheDocument();
  });
});
