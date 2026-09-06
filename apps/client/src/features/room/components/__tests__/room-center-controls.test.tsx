import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";

import { RoomCenterControls } from "../room-center-controls";

function renderControls(overrides?: Partial<React.ComponentProps<typeof RoomCenterControls>>) {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <RoomCenterControls
          isScreenSharing={false}
          isScreenShareSupported={true}
          isScreenShareBlocked={false}
          screenShareState="idle"
          onToggleScreenShare={vi.fn().mockResolvedValue(undefined)}
          recordingState="idle"
          elapsedSeconds={0}
          isRecordingSupported={true}
          isRecordingEnabled={true}
          onToggleRecord={vi.fn()}
          {...overrides}
        />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe("RoomCenterControls - screen share button", () => {
  it("renders screen share button when supported", () => {
    renderControls();
    expect(screen.getByRole("button", { name: "Share screen" })).toBeInTheDocument();
  });

  it("hides screen share button when not supported", () => {
    renderControls({ isScreenShareSupported: false });
    expect(screen.queryByRole("button", { name: "Share screen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Stop screen share" })).not.toBeInTheDocument();
  });

  it("shows Stop icon and aria-pressed=true when sharing is active", () => {
    renderControls({ isScreenSharing: true, screenShareState: "sharing" });
    const btn = screen.getByRole("button", { name: "Stop screen share" });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("shows Share icon and aria-pressed=false when idle", () => {
    renderControls({ isScreenSharing: false, screenShareState: "idle" });
    const btn = screen.getByRole("button", { name: "Share screen" });
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("disables button during starting state", () => {
    renderControls({ isScreenSharing: false, screenShareState: "starting" });
    expect(screen.getByRole("button", { name: "Share screen" })).toBeDisabled();
  });

  it("disables button when isScreenShareBlocked is true and not sharing", () => {
    renderControls({ isScreenShareBlocked: true, screenShareState: "idle" });
    expect(
      screen.getByRole("button", { name: "Another participant is sharing their screen" }),
    ).toBeDisabled();
  });

  it("does not disable button for the active sharer", () => {
    renderControls({
      isScreenSharing: true,
      isScreenShareBlocked: false,
      screenShareState: "sharing",
    });
    expect(screen.getByRole("button", { name: "Stop screen share" })).not.toBeDisabled();
  });

  it("calls onToggleScreenShare when button is clicked", () => {
    const onToggleScreenShare = vi.fn().mockResolvedValue(undefined);
    renderControls({ onToggleScreenShare });

    fireEvent.click(screen.getByRole("button", { name: "Share screen" }));

    expect(onToggleScreenShare).toHaveBeenCalledOnce();
  });

  it("renders Leave room link", () => {
    renderControls();
    expect(screen.getByRole("link", { name: "Leave room" })).toBeInTheDocument();
  });
});

describe("RoomCenterControls - record button", () => {
  it("renders record button when supported", () => {
    renderControls();
    expect(
      screen.getByRole("button", {
        name: "Record the call - saves a .webm with all participants to your device",
      }),
    ).toBeInTheDocument();
  });

  it("hides record button when not supported", () => {
    renderControls({ isRecordingSupported: false });
    expect(
      screen.queryByRole("button", {
        name: "Record the call - saves a .webm with all participants to your device",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Stop recording - saves a .webm to your device" }),
    ).not.toBeInTheDocument();
  });

  it("disables record button when no track is active", () => {
    renderControls({ isRecordingEnabled: false });
    expect(
      screen.getByRole("button", {
        name: "Record the call - saves a .webm with all participants to your device",
      }),
    ).toBeDisabled();
  });

  it("disables record button while saving", () => {
    renderControls({ recordingState: "saving", isRecordingEnabled: false });
    expect(
      screen.getByRole("button", {
        name: "Record the call - saves a .webm with all participants to your device",
      }),
    ).toBeDisabled();
  });

  it("enables record button when idle with an active track", () => {
    renderControls({ recordingState: "idle", isRecordingEnabled: true });
    expect(
      screen.getByRole("button", {
        name: "Record the call - saves a .webm with all participants to your device",
      }),
    ).not.toBeDisabled();
  });

  it("shows stop state with aria-pressed while recording", () => {
    renderControls({ recordingState: "recording", elapsedSeconds: 65 });
    const btn = screen.getByRole("button", {
      name: "Stop recording - saves a .webm to your device",
    });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(btn).not.toBeDisabled();
  });

  it("shows start state with aria-pressed=false when idle", () => {
    renderControls({ recordingState: "idle" });
    expect(
      screen.getByRole("button", {
        name: "Record the call - saves a .webm with all participants to your device",
      }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("shows elapsed time as mm:ss while recording", () => {
    renderControls({ recordingState: "recording", elapsedSeconds: 65 });
    expect(screen.getByText("01:05")).toBeInTheDocument();
  });

  it("shows elapsed time for zero seconds while recording", () => {
    renderControls({ recordingState: "recording", elapsedSeconds: 0 });
    expect(screen.getByText("00:00")).toBeInTheDocument();
  });

  it("does not show elapsed time when idle", () => {
    renderControls({ recordingState: "idle", elapsedSeconds: 0 });
    expect(screen.queryByText("00:00")).not.toBeInTheDocument();
  });

  it("calls onToggleRecord when record button is clicked", () => {
    const onToggleRecord = vi.fn();
    renderControls({ onToggleRecord });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Record the call - saves a .webm with all participants to your device",
      }),
    );

    expect(onToggleRecord).toHaveBeenCalledOnce();
  });
});
