import { beforeEach, describe, expect, it, vi } from "vitest";

import { ScreenShareService } from "../service";
import type { IDisplayMediaService, IScreenShareSfuPort } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTrack(overrides?: Partial<MediaStreamTrack>): MediaStreamTrack {
  return {
    stop: vi.fn(),
    addEventListener: vi.fn(),
    kind: "video",
    ...overrides,
  } as unknown as MediaStreamTrack;
}

function makeStream(tracks: MediaStreamTrack[] = []): MediaStream {
  return {
    getVideoTracks: () => tracks,
    getTracks: () => tracks,
  } as unknown as MediaStream;
}

function makeSfu(overrides?: Partial<IScreenShareSfuPort>): IScreenShareSfuPort {
  const callbacks = new Set<(s: { isScreenShareBlocked: boolean }) => void>();
  return {
    onStateChange: (cb) => {
      callbacks.add(cb);
      cb({ isScreenShareBlocked: false });
      return () => callbacks.delete(cb);
    },
    produceScreen: vi.fn().mockResolvedValue({}),
    closeScreenProducer: vi.fn(),
    ...overrides,
  };
}

function makeDisplayMedia(stream?: MediaStream): IDisplayMediaService {
  return {
    getDisplayMedia: vi.fn().mockResolvedValue(stream ?? makeStream([makeTrack()])),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ScreenShareService", () => {
  let sfu: IScreenShareSfuPort;
  let displayMedia: IDisplayMediaService;
  let service: ScreenShareService;

  beforeEach(() => {
    sfu = makeSfu();
    displayMedia = makeDisplayMedia();
    service = new ScreenShareService({ sfu, displayMedia });
  });

  // --- initial state ---

  it("starts with isSharing=false and no stream", () => {
    const state = service.getState();
    expect(state.isSharing).toBe(false);
    expect(state.screenStream).toBeNull();
    expect(state.isScreenShareBlocked).toBe(false);
  });

  // --- onStateChange subscription ---

  it("calls subscriber immediately with current state on subscribe", () => {
    const cb = vi.fn();
    service.onStateChange(cb);
    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isSharing: false }));
  });

  it("returns an unsubscribe function", () => {
    const cb = vi.fn();
    const unsub = service.onStateChange(cb);
    cb.mockClear();
    unsub();
    // trigger state change — no further calls expected
    void service.start().catch(() => {});
    expect(cb).not.toHaveBeenCalled();
  });

  // --- isScreenShareBlocked sync ---

  it("syncs isScreenShareBlocked from SFU state", () => {
    let sfuCallback: ((s: { isScreenShareBlocked: boolean }) => void) | undefined;
    const trackingSfu = makeSfu({
      onStateChange: (cb) => {
        sfuCallback = cb;
        cb({ isScreenShareBlocked: false });
        return () => {};
      },
    });
    const s = new ScreenShareService({ sfu: trackingSfu, displayMedia });

    const stateListener = vi.fn();
    s.onStateChange(stateListener);
    stateListener.mockClear();

    sfuCallback!({ isScreenShareBlocked: true });
    expect(stateListener).toHaveBeenCalledWith(
      expect.objectContaining({ isScreenShareBlocked: true }),
    );
  });

  it("does not notify when isScreenShareBlocked value is unchanged", () => {
    let sfuCallback: ((s: { isScreenShareBlocked: boolean }) => void) | undefined;
    const trackingSfu = makeSfu({
      onStateChange: (cb) => {
        sfuCallback = cb;
        cb({ isScreenShareBlocked: false });
        return () => {};
      },
    });
    const s = new ScreenShareService({ sfu: trackingSfu, displayMedia });
    const stateListener = vi.fn();
    s.onStateChange(stateListener);
    stateListener.mockClear();

    sfuCallback!({ isScreenShareBlocked: false }); // same value
    expect(stateListener).not.toHaveBeenCalled();
  });

  // --- start happy path ---

  it("sets isSharing=true and provides screenStream on successful start", async () => {
    const cb = vi.fn();
    service.onStateChange(cb);
    cb.mockClear();

    await service.start();

    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ isSharing: true, screenStream: expect.any(Object) }),
    );
    expect(service.getState().isSharing).toBe(true);
  });

  it("attaches ended listener to screen track on start", async () => {
    const track = makeTrack();
    displayMedia = makeDisplayMedia(makeStream([track]));
    service = new ScreenShareService({ sfu, displayMedia });

    await service.start();

    expect(track.addEventListener).toHaveBeenCalledWith("ended", expect.any(Function), {
      once: true,
    });
  });

  // --- start error paths ---

  it("throws 'denied' when getDisplayMedia rejects with generic error", async () => {
    (displayMedia.getDisplayMedia as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("user denied"),
    );
    await expect(service.start()).rejects.toBe("denied");
  });

  it("throws 'unsupported' when getDisplayMedia rejects with NotSupportedError", async () => {
    const err = new DOMException("not supported", "NotSupportedError");
    (displayMedia.getDisplayMedia as ReturnType<typeof vi.fn>).mockRejectedValueOnce(err);
    await expect(service.start()).rejects.toBe("unsupported");
  });

  it("throws 'blocked' when produceScreen rejects with SCREEN_SHARE_ALREADY_ACTIVE", async () => {
    const blockedError = { code: "SCREEN_SHARE_ALREADY_ACTIVE" };
    (sfu.produceScreen as ReturnType<typeof vi.fn>).mockRejectedValueOnce(blockedError);
    await expect(service.start()).rejects.toBe("blocked");
  });

  it("throws 'denied' when produceScreen rejects with unknown error", async () => {
    (sfu.produceScreen as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("sfu error"));
    await expect(service.start()).rejects.toBe("denied");
  });

  it("throws 'denied' when produceScreen returns null", async () => {
    (sfu.produceScreen as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    await expect(service.start()).rejects.toBe("denied");
  });

  it("stops the track when produceScreen fails", async () => {
    const track = makeTrack();
    displayMedia = makeDisplayMedia(makeStream([track]));
    service = new ScreenShareService({ sfu, displayMedia });
    (sfu.produceScreen as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("fail"));

    await expect(service.start()).rejects.toBeDefined();
    expect(track.stop).toHaveBeenCalled();
  });

  it("does nothing when stream has no video tracks", async () => {
    displayMedia = makeDisplayMedia(makeStream([]));
    service = new ScreenShareService({ sfu, displayMedia });
    await service.start();
    expect(service.getState().isSharing).toBe(false);
  });

  // --- stop ---

  it("resets state and closes SFU producer on stop", async () => {
    await service.start();
    expect(service.getState().isSharing).toBe(true);

    service.stop();

    expect(sfu.closeScreenProducer).toHaveBeenCalled();
    expect(service.getState().isSharing).toBe(false);
    expect(service.getState().screenStream).toBeNull();
  });

  it("stops all tracks on stop", async () => {
    const track = makeTrack();
    displayMedia = makeDisplayMedia(makeStream([track]));
    service = new ScreenShareService({ sfu, displayMedia });

    await service.start();
    service.stop();

    expect(track.stop).toHaveBeenCalled();
  });

  // --- destroy ---

  it("clears callbacks and unsubscribes from SFU on destroy", () => {
    const cb = vi.fn();
    service.onStateChange(cb);
    cb.mockClear();

    service.destroy();

    // After destroy, internal callback set is cleared — subsequent state
    // changes must not reach cleared subscribers.
    service.stop(); // would normally notify
    expect(cb).not.toHaveBeenCalled();
  });
});
