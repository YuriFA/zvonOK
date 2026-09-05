import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SfuManager } from "@zvonok/client/sfu/manager";

import { ZvonokHostError } from "../errors.js";
import { useHostControls } from "../use-host-controls.js";
import { ZvonokProvider, useZvonokSession } from "../zvonok-context.js";
import { createMockSfuManager, type MockSfuManager } from "./doubles.js";

function Provider({ children }: { children: ReactNode }) {
  return <ZvonokProvider serverUrl="https://sfu.test">{children}</ZvonokProvider>;
}

function renderControls() {
  return renderHook(
    () => {
      const session = useZvonokSession();
      const controls = useHostControls();
      return { session, controls };
    },
    { wrapper: Provider },
  );
}

async function attachManager(
  result: ReturnType<typeof renderControls>["result"],
  sfu: MockSfuManager,
) {
  await act(async () => {
    result.current.session.update({ manager: sfu.manager as unknown as SfuManager, status: "joined" });
  });
}

describe("useHostControls", () => {
  let sfu: MockSfuManager;

  beforeEach(() => {
    sfu = createMockSfuManager();
  });

  it("emits sfu:mute-peer with the target and resolves after the denial window", async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderControls();
      await attachManager(result, sfu);

      let promise: Promise<void> = Promise.resolve();
      act(() => {
        promise = result.current.controls.mutePeer("peer-1");
      });
      expect(sfu.socket.emissions).toContainEqual({ event: "sfu:mute-peer", payload: { userId: "peer-1" } });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3_000);
        await promise;
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects mutePeer with a typed error when the server denies", async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderControls();
      await attachManager(result, sfu);

      let promise: Promise<void> = Promise.resolve();
      act(() => {
        promise = result.current.controls.mutePeer("peer-1");
      });
      await act(async () => {
        sfu.socket.fire("sfu:host-error", { code: "NOT_ROOM_HOST", message: "not the host" });
        await expect(promise).rejects.toBeInstanceOf(ZvonokHostError);
      });
      await expect(promise).rejects.toMatchObject({ code: "NOT_ROOM_HOST" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("emits sfu:mute-all to everyone-else semantics with an empty payload", async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderControls();
      await attachManager(result, sfu);

      let promise: Promise<void> = Promise.resolve();
      act(() => {
        promise = result.current.controls.muteAll();
      });
      expect(sfu.socket.emissions).toContainEqual({ event: "sfu:mute-all", payload: {} });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3_000);
        await promise;
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("emits sfu:lock-room with the requested state", async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderControls();
      await attachManager(result, sfu);

      let promise: Promise<void> = Promise.resolve();
      act(() => {
        promise = result.current.controls.lockRoom(true);
      });
      expect(sfu.socket.emissions).toContainEqual({ event: "sfu:lock-room", payload: { locked: true } });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3_000);
        await promise;
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("kickPeer delegates to the manager", async () => {
    const { result } = renderControls();
    await attachManager(result, sfu);

    act(() => {
      result.current.controls.kickPeer("peer-7");
    });

    expect(sfu.manager.kickPeer).toHaveBeenCalledWith("peer-7");
  });

  it("rejects with a typed error when there is no connection", async () => {
    const { result } = renderControls();

    await expect(result.current.controls.mutePeer("peer-1")).rejects.toMatchObject({
      code: "DISCONNECTED",
    });
    await expect(result.current.controls.muteAll()).rejects.toMatchObject({ code: "DISCONNECTED" });
    await expect(result.current.controls.lockRoom(true)).rejects.toMatchObject({
      code: "DISCONNECTED",
    });
  });
});
