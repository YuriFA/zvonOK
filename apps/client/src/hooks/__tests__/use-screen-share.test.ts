import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- mocks (hoisted before imports) ---

const mockProduceScreen = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ id: "screen-producer", kind: "video" }),
);
const mockCloseScreenProducer = vi.hoisted(() => vi.fn());
const mockIsScreenShareBlocked = vi.hoisted(() => vi.fn(() => false));
const mockOnStateChange = vi.hoisted(() => vi.fn(() => () => {}));
const mockGetDisplayMedia = vi.hoisted(() => vi.fn());

const mockSfuManager = {
  produceScreen: mockProduceScreen,
  closeScreenProducer: mockCloseScreenProducer,
  isScreenShareBlocked: mockIsScreenShareBlocked,
  onStateChange: mockOnStateChange,
};

vi.mock("@/features/sfu/contexts/sfu-manager.context", () => ({
  useSfuManager: () => mockSfuManager,
}));

// jsdom does not define navigator.mediaDevices — stub it globally
vi.stubGlobal("navigator", {
  mediaDevices: {
    getDisplayMedia: mockGetDisplayMedia,
  },
});

// --- subject ---

import { SfuProduceError } from "@/lib/sfu/types";

import { useScreenShare } from "../use-screen-share";

// --- helpers ---

function makeVideoTrack(): MediaStreamTrack {
  const listeners = new Map<string, EventListenerOrEventListenerObject>();
  return {
    kind: "video",
    readyState: "live",
    addEventListener: vi.fn((event: string, cb: EventListenerOrEventListenerObject) => {
      listeners.set(event, cb);
    }),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn((e: Event) => {
      const cb = listeners.get(e.type);
      if (cb) {
        if (typeof cb === "function") cb(e);
        else cb.handleEvent(e);
      }
      return true;
    }),
    stop: vi.fn(),
  } as unknown as MediaStreamTrack;
}

function makeDisplayMediaStream(track: MediaStreamTrack): MediaStream {
  return {
    getVideoTracks: () => [track],
    getTracks: () => [track],
  } as unknown as MediaStream;
}

describe("useScreenShare", () => {
  beforeEach(() => {
    mockProduceScreen.mockClear();
    mockProduceScreen.mockResolvedValue({ id: "screen-producer", kind: "video" });
    mockCloseScreenProducer.mockClear();
    mockIsScreenShareBlocked.mockClear();
    mockIsScreenShareBlocked.mockReturnValue(false);
    mockOnStateChange.mockClear();
    mockOnStateChange.mockReturnValue(() => {});
    mockGetDisplayMedia.mockReset();
  });

  // --- happy path ---

  it("starts with isSharing=false", () => {
    const { result } = renderHook(() => useScreenShare());
    expect(result.current.isSharing).toBe(false);
  });

  it("starts with screenStream=null", () => {
    const { result } = renderHook(() => useScreenShare());
    expect(result.current.screenStream).toBeNull();
  });

  it("startScreenShare: creates screen producer and sets isSharing=true", async () => {
    const screenTrack = makeVideoTrack();
    mockGetDisplayMedia.mockResolvedValue(makeDisplayMediaStream(screenTrack));

    const { result } = renderHook(() => useScreenShare());

    await act(async () => {
      await result.current.startScreenShare();
    });

    expect(mockGetDisplayMedia).toHaveBeenCalledWith({
      video: { cursor: "always" },
      audio: false,
    });
    expect(mockProduceScreen).toHaveBeenCalledWith(screenTrack);
    expect(result.current.isSharing).toBe(true);
  });

  it("startScreenShare: sets screenStream to the display media stream", async () => {
    const screenTrack = makeVideoTrack();
    const stream = makeDisplayMediaStream(screenTrack);
    mockGetDisplayMedia.mockResolvedValue(stream);

    const { result } = renderHook(() => useScreenShare());

    await act(async () => {
      await result.current.startScreenShare();
    });

    expect(result.current.screenStream).toBe(stream);
  });

  it("stopScreenShare: closes screen producer and sets isSharing=false", async () => {
    const screenTrack = makeVideoTrack();
    mockGetDisplayMedia.mockResolvedValue(makeDisplayMediaStream(screenTrack));

    const { result } = renderHook(() => useScreenShare());

    await act(async () => {
      await result.current.startScreenShare();
    });

    expect(result.current.isSharing).toBe(true);

    await act(async () => {
      await result.current.stopScreenShare();
    });

    expect(mockCloseScreenProducer).toHaveBeenCalled();
    expect(result.current.isSharing).toBe(false);
    expect(result.current.screenStream).toBeNull();
  });

  it("auto-stop: track.ended event triggers stopScreenShare", async () => {
    const screenTrack = makeVideoTrack();
    mockGetDisplayMedia.mockResolvedValue(makeDisplayMediaStream(screenTrack));

    const { result } = renderHook(() => useScreenShare());

    await act(async () => {
      await result.current.startScreenShare();
    });

    expect(result.current.isSharing).toBe(true);

    await act(async () => {
      screenTrack.dispatchEvent(new Event("ended"));
    });

    expect(mockCloseScreenProducer).toHaveBeenCalled();
    expect(result.current.isSharing).toBe(false);
    expect(result.current.screenStream).toBeNull();
  });

  // --- error handling ---

  it("NotAllowedError: throws 'denied' error code", async () => {
    mockGetDisplayMedia.mockRejectedValue(new DOMException("User cancelled", "NotAllowedError"));

    const { result } = renderHook(() => useScreenShare());

    await expect(
      act(async () => {
        await result.current.startScreenShare();
      }),
    ).rejects.toBe("denied");

    expect(mockProduceScreen).not.toHaveBeenCalled();
    expect(result.current.isSharing).toBe(false);
  });

  it("NotSupportedError: throws 'unsupported' error code", async () => {
    mockGetDisplayMedia.mockRejectedValue(new DOMException("Not supported", "NotSupportedError"));

    const { result } = renderHook(() => useScreenShare());

    await expect(
      act(async () => {
        await result.current.startScreenShare();
      }),
    ).rejects.toBe("unsupported");

    expect(result.current.isSharing).toBe(false);
  });

  it("unknown errors: throw 'denied' error code", async () => {
    mockGetDisplayMedia.mockRejectedValue(new Error("Unexpected failure"));

    const { result } = renderHook(() => useScreenShare());

    await expect(
      act(async () => {
        await result.current.startScreenShare();
      }),
    ).rejects.toBe("denied");

    expect(result.current.isSharing).toBe(false);
  });

  // --- produceScreen failure ---

  it("startScreenShare: throws 'denied' and stops track when produceScreen returns null", async () => {
    const screenTrack = makeVideoTrack();
    mockGetDisplayMedia.mockResolvedValue(makeDisplayMediaStream(screenTrack));
    mockProduceScreen.mockResolvedValue(null);

    const { result } = renderHook(() => useScreenShare());

    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.startScreenShare();
      } catch (e) {
        thrown = e;
      }
    });

    expect(thrown).toBe("denied");
    expect(screenTrack.stop).toHaveBeenCalled();
    expect(result.current.isSharing).toBe(false);
  });

  it("startScreenShare: throws 'blocked' when produceScreen rejects with blocked message", async () => {
    const screenTrack = makeVideoTrack();
    mockGetDisplayMedia.mockResolvedValue(makeDisplayMediaStream(screenTrack));
    mockProduceScreen.mockRejectedValue(
      new SfuProduceError("SCREEN_SHARE_ALREADY_ACTIVE", "Another participant is already sharing"),
    );

    const { result } = renderHook(() => useScreenShare());

    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.startScreenShare();
      } catch (e) {
        thrown = e;
      }
    });

    expect(thrown).toBe("blocked");
    expect(screenTrack.stop).toHaveBeenCalled();
    expect(result.current.isSharing).toBe(false);
  });
});
