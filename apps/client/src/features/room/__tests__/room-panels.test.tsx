import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@zvonok/whiteboard-react/panel", () => ({
  WhiteboardPanel: (props: { roomSlug: string; isOwner: boolean }) => (
    <div
      data-testid="whiteboard-panel-mock"
      data-slug={props.roomSlug}
      data-owner={props.isOwner}
    />
  ),
}));

import { roomPanels } from "../room-panels";

describe("room panel registry", () => {
  it("registers the whiteboard with a unique id and metadata", () => {
    expect(roomPanels.map((panel) => panel.id)).toEqual(["board"]);
    const whiteboard = roomPanels.find((panel) => panel.id === "board");
    expect(whiteboard?.title).toBe("Whiteboard");
    expect(whiteboard?.icon).toBeDefined();
  });

  it("mounts the registered panel with the injected room context", async () => {
    const whiteboard = roomPanels.find((panel) => panel.id === "board");
    expect(whiteboard).toBeDefined();
    if (!whiteboard) return;

    render(<whiteboard.component roomSlug="room-slug" isOwner onClose={() => {}} />);
    expect(await screen.findByTestId("whiteboard-panel-mock")).toHaveAttribute(
      "data-slug",
      "room-slug",
    );
    expect(screen.getByTestId("whiteboard-panel-mock")).toHaveAttribute("data-owner", "true");
  });
});
