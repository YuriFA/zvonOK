import { act, fireEvent, render, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useKeyboardShortcuts } from "../use-keyboard-shortcuts";

function setup(overrides?: Partial<Parameters<typeof useKeyboardShortcuts>[0]>) {
  const onToggleAudio = vi.fn().mockResolvedValue(undefined);
  const onToggleVideo = vi.fn().mockResolvedValue(undefined);
  const onToggleScreenShare = vi.fn().mockResolvedValue(undefined);
  const { unmount } = renderHook(() =>
    useKeyboardShortcuts({
      onToggleAudio,
      onToggleVideo,
      onToggleScreenShare,
      ...overrides,
    }),
  );
  return { onToggleAudio, onToggleVideo, onToggleScreenShare, unmount };
}

function pressKey(key: string, init?: KeyboardEventInit) {
  fireEvent.keyDown(window, { key, ...init });
}

describe("useKeyboardShortcuts", () => {
  it("m toggles audio, v toggles video, s toggles screen share", () => {
    const handlers = setup();

    act(() => pressKey("m"));
    act(() => pressKey("v"));
    act(() => pressKey("s"));

    expect(handlers.onToggleAudio).toHaveBeenCalledTimes(1);
    expect(handlers.onToggleVideo).toHaveBeenCalledTimes(1);
    expect(handlers.onToggleScreenShare).toHaveBeenCalledTimes(1);
  });

  it("matches keys case-insensitively", () => {
    const handlers = setup();

    act(() => pressKey("M"));

    expect(handlers.onToggleAudio).toHaveBeenCalledTimes(1);
  });

  it("ignores unknown keys", () => {
    const handlers = setup();

    act(() => pressKey("x"));

    expect(handlers.onToggleAudio).not.toHaveBeenCalled();
    expect(handlers.onToggleVideo).not.toHaveBeenCalled();
    expect(handlers.onToggleScreenShare).not.toHaveBeenCalled();
  });

  it("suppresses shortcuts while typing in editable elements", () => {
    const handlers = setup();

    const { getByLabelText } = render(
      <main>
        <input aria-label="chat input" />
        <textarea aria-label="note" />
        <div aria-label="editor" contentEditable role="textbox" />
      </main>,
    );
    // jsdom does not implement isContentEditable
    Object.defineProperty(getByLabelText("editor"), "isContentEditable", {
      value: true,
    });

    act(() => fireEvent.keyDown(getByLabelText("chat input"), { key: "m" }));
    act(() => fireEvent.keyDown(getByLabelText("note"), { key: "v" }));
    act(() => fireEvent.keyDown(getByLabelText("editor"), { key: "s" }));

    expect(handlers.onToggleAudio).not.toHaveBeenCalled();
    expect(handlers.onToggleVideo).not.toHaveBeenCalled();
    expect(handlers.onToggleScreenShare).not.toHaveBeenCalled();
  });

  it("suppresses shortcuts with ctrl/meta/alt modifiers", () => {
    const handlers = setup();

    act(() => pressKey("m", { ctrlKey: true }));
    act(() => pressKey("m", { metaKey: true }));
    act(() => pressKey("m", { altKey: true }));

    expect(handlers.onToggleAudio).not.toHaveBeenCalled();
  });

  it("ignores held-key repeats", () => {
    const handlers = setup();

    act(() => pressKey("m", { repeat: true }));

    expect(handlers.onToggleAudio).not.toHaveBeenCalled();
  });

  it("is inert when enabled is false", () => {
    const handlers = setup({ enabled: false });

    act(() => pressKey("m"));

    expect(handlers.onToggleAudio).not.toHaveBeenCalled();
  });

  it("removes the listener on unmount", () => {
    const handlers = setup();

    handlers.unmount();
    act(() => pressKey("m"));

    expect(handlers.onToggleAudio).not.toHaveBeenCalled();
  });
});
