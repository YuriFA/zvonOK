import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

class MockMediaStream {
  private tracks: MediaStreamTrack[];

  constructor(tracks: MediaStreamTrack[] = []) {
    this.tracks = [...tracks];
  }

  addTrack(track: MediaStreamTrack): void {
    this.tracks.push(track);
  }

  getTracks(): MediaStreamTrack[] {
    return [...this.tracks];
  }

  getVideoTracks(): MediaStreamTrack[] {
    return this.tracks.filter((track) => track.kind === "video");
  }

  getAudioTracks(): MediaStreamTrack[] {
    return this.tracks.filter((track) => track.kind === "audio");
  }
}

vi.stubGlobal("MediaStream", MockMediaStream);

const mockUseAuth = vi.hoisted(() => vi.fn());

const sfuMock = vi.hoisted(() => {
  const socketListeners = new Map<string, Set<(...args: unknown[]) => void>>();
  const socket = {
    on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      if (!socketListeners.has(event)) {
        socketListeners.set(event, new Set());
      }
      socketListeners.get(event)?.add(callback);
    }),
    off: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      socketListeners.get(event)?.delete(callback);
    }),
    emit: vi.fn(),
  };
  const noopUnsubscribe = () => () => {};
  const manager = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    leaveRoom: vi.fn(),
    kickPeer: vi.fn(),
    joinRoom: vi.fn().mockResolvedValue(undefined),
    produce: vi.fn().mockResolvedValue({ id: "p", kind: "audio" }),
    produceScreen: vi.fn(),
    closeScreenProducer: vi.fn(),
    isScreenShareBlocked: vi.fn(() => false),
    onProduceError: vi.fn(() => () => {}),
    onJoinError: vi.fn(() => () => {}),
    pauseProducer: vi.fn(),
    resumeProducer: vi.fn(),
    replaceTrack: vi.fn().mockResolvedValue(true),
    getProducerByKind: vi.fn(),
    getSocket: vi.fn(() => socket),
    getState: vi.fn(() => ({
      connectionState: "connected",
      isSendTransportCreated: false,
    })),
    onStateChange: vi.fn(() => noopUnsubscribe),
    onTrack: vi.fn(() => noopUnsubscribe),
    onPeerJoined: vi.fn(() => noopUnsubscribe),
    onPeerLeft: vi.fn(() => noopUnsubscribe),
    onKicked: vi.fn(() => noopUnsubscribe),
    onProducerStateChange: vi.fn(() => noopUnsubscribe),
    onScreenShareStopped: vi.fn(() => noopUnsubscribe),
    emitSocketEvent(event: string, payload: unknown) {
      socketListeners.get(event)?.forEach((callback) => callback(payload));
    },
  };
  return { manager, socket };
});

vi.mock("@/features/auth/contexts/auth.context", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("@/features/sfu/contexts/sfu-manager.context", () => ({
  useSfuManager: () => sfuMock.manager,
}));

vi.mock("./use-is-mobile", () => ({
  useIsMobile: () => false,
}));

import { useMediasoup } from "../use-mediasoup";

describe("useMediasoup host features", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: { id: "user-1", username: "alice" } });
  });

  const renderMediasoup = () =>
    renderHook(() =>
      useMediasoup({
        roomId: "room-1",
        localVideoStream: null,
        localAudioStream: null,
        enabled: true,
        displayName: "alice",
      }),
    );

  it("tracks the room lock from sfu:room-locked events", () => {
    const { result } = renderMediasoup();

    expect(result.current.isRoomLocked).toBe(false);

    act(() => {
      sfuMock.manager.emitSocketEvent("sfu:room-locked", { locked: true });
    });
    expect(result.current.isRoomLocked).toBe(true);

    act(() => {
      sfuMock.manager.emitSocketEvent("sfu:room-locked", { locked: false });
    });
    expect(result.current.isRoomLocked).toBe(false);
  });

  it("flags mutedByHost only when the local user is muted", () => {
    const { result } = renderMediasoup();

    act(() => {
      sfuMock.manager.emitSocketEvent("sfu:peer-muted", { userId: "user-2" });
    });
    expect(result.current.mutedByHost).toBe(false);

    act(() => {
      sfuMock.manager.emitSocketEvent("sfu:peer-muted", { userId: "user-1" });
    });
    expect(result.current.mutedByHost).toBe(true);
  });

  it("marks the remote participant as muted by host", () => {
    const { result } = renderMediasoup();

    act(() => {
      sfuMock.manager.emitSocketEvent("sfu:peer-muted", { userId: "user-2" });
    });

    const peer = result.current.remotePeers.find((p) => p.userId === "user-2");
    expect(peer?.mutedByHost).toBe(true);
    expect(result.current.mutedByHost).toBe(false);
  });

  it("emits mute-peer and rejects with the server denial", async () => {
    const { result } = renderMediasoup();

    const promise = result.current.hostControls.mutePeer("user-2");
    expect(sfuMock.socket.emit).toHaveBeenCalledWith("sfu:mute-peer", { userId: "user-2" });

    // Attach the rejection expectation before emitting, so the rejection is
    // handled in the same tick it happens.
    const expectation = expect(promise).rejects.toMatchObject({
      code: "NOT_ROOM_HOST",
      message: "not the host",
    });

    act(() => {
      sfuMock.manager.emitSocketEvent("sfu:host-error", {
        code: "NOT_ROOM_HOST",
        message: "not the host",
      });
    });

    await expectation;
  });

  it("emits lock-room toggles through host controls", async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderMediasoup();

      const promise = result.current.hostControls.lockRoom(true);
      expect(sfuMock.socket.emit).toHaveBeenCalledWith("sfu:lock-room", { locked: true });

      // No denial arrives: the action resolves once the denial window lapses.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
      await expect(promise).resolves.toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});
