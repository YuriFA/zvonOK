import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- mocks (hoisted before imports) ---

const mockReplaceTrack = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const mockGetTrack = vi.hoisted(() => vi.fn().mockReturnValue(null));
const mockGetDisplayMedia = vi.hoisted(() => vi.fn());

vi.mock("@/features/sfu/contexts/sfu-manager.context", () => ({
  useSfuManager: () => ({ replaceTrack: mockReplaceTrack }),
}));

vi.mock("@/features/media/contexts/media-manager.context", () => ({
  useCaptureTrackProvider: () => ({ getTrack: mockGetTrack }),
}));

// jsdom does not define navigator.mediaDevices — stub it globally
vi.stubGlobal("navigator", {
  mediaDevices: {
    getDisplayMedia: mockGetDisplayMedia,
  },
});

// --- subject ---

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
  } as unknown as MediaStream;
}

describe("useScreenShare", () => {
  beforeEach(() => {
    mockReplaceTrack.mockClear();
    mockReplaceTrack.mockResolvedValue(true);
    mockGetTrack.mockReset();
    mockGetTrack.mockReturnValue(null);
    mockGetDisplayMedia.mockReset();
  });

  // --- happy path ---

  it("starts with isSharing=false", () => {
    const { result } = renderHook(() => useScreenShare());
    expect(result.current.isSharing).toBe(false);
  });

  it("startScreenShare: replaces SFU track and sets isSharing=true", async () => {
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
    expect(mockReplaceTrack).toHaveBeenCalledWith("video", screenTrack);
    expect(result.current.isSharing).toBe(true);
  });

  it("stopScreenShare: restores camera track and sets isSharing=false", async () => {
    const screenTrack = makeVideoTrack();
    const cameraTrack = makeVideoTrack();

    mockGetDisplayMedia.mockResolvedValue(makeDisplayMediaStream(screenTrack));
    mockGetTrack.mockReturnValue(cameraTrack);

    const { result } = renderHook(() => useScreenShare());

    await act(async () => {
      await result.current.startScreenShare();
    });

    expect(result.current.isSharing).toBe(true);

    await act(async () => {
      await result.current.stopScreenShare();
    });

    expect(mockReplaceTrack).toHaveBeenLastCalledWith("video", cameraTrack);
    expect(result.current.isSharing).toBe(false);
  });

  it("stopScreenShare: passes null when camera track is not available", async () => {
    const screenTrack = makeVideoTrack();
    mockGetDisplayMedia.mockResolvedValue(makeDisplayMediaStream(screenTrack));
    mockGetTrack.mockReturnValue(null);

    const { result } = renderHook(() => useScreenShare());

    await act(async () => {
      await result.current.startScreenShare();
      await result.current.stopScreenShare();
    });

    expect(mockReplaceTrack).toHaveBeenLastCalledWith("video", null);
    expect(result.current.isSharing).toBe(false);
  });

  it("auto-stop: track.ended event triggers stopScreenShare", async () => {
    const screenTrack = makeVideoTrack();
    const cameraTrack = makeVideoTrack();

    mockGetDisplayMedia.mockResolvedValue(makeDisplayMediaStream(screenTrack));
    mockGetTrack.mockReturnValue(cameraTrack);

    const { result } = renderHook(() => useScreenShare());

    await act(async () => {
      await result.current.startScreenShare();
    });

    expect(result.current.isSharing).toBe(true);

    // Simulate browser "Stop sharing" button
    await act(async () => {
      screenTrack.dispatchEvent(new Event("ended"));
    });

    expect(mockReplaceTrack).toHaveBeenLastCalledWith("video", cameraTrack);
    expect(result.current.isSharing).toBe(false);
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

    expect(mockReplaceTrack).not.toHaveBeenCalled();
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

  // --- replaceTrack failure ---

  it("startScreenShare: throws 'denied' and stops track when replaceTrack returns false", async () => {
    const screenTrack = makeVideoTrack();
    mockGetDisplayMedia.mockResolvedValue(makeDisplayMediaStream(screenTrack));
    mockReplaceTrack.mockResolvedValue(false);

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

  it("stopScreenShare: throws 'denied' and does not clear isSharing when replaceTrack returns false", async () => {
    const screenTrack = makeVideoTrack();
    mockGetDisplayMedia.mockResolvedValue(makeDisplayMediaStream(screenTrack));

    const { result } = renderHook(() => useScreenShare());

    // Start successfully first
    await act(async () => {
      await result.current.startScreenShare();
    });
    expect(result.current.isSharing).toBe(true);

    // Now fail the stop
    mockReplaceTrack.mockResolvedValue(false);

    await expect(
      act(async () => {
        await result.current.stopScreenShare();
      }),
    ).rejects.toBe("denied");

    expect(result.current.isSharing).toBe(true);
  });
});
