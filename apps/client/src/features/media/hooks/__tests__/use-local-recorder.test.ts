import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useLocalRecorder } from "../use-local-recorder";

// --- fakes (jsdom has no MediaRecorder/MediaStream) ---

class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = [];
  static isTypeSupported = vi.fn((_mimeType: string) => false);

  stream: MediaStream;
  mimeType: string;
  state: "inactive" | "recording" | "paused" = "inactive";
  startTimeslice: number | undefined;
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;

  constructor(stream: MediaStream, options?: { mimeType?: string }) {
    this.stream = stream;
    this.mimeType = options?.mimeType ?? "";
    FakeMediaRecorder.instances.push(this);
  }

  start(timeslice?: number) {
    this.state = "recording";
    this.startTimeslice = timeslice;
  }

  stop() {
    this.state = "inactive";
    this.onstop?.();
  }

  emitData(size: number) {
    this.ondataavailable?.({ data: new Blob(["x".repeat(size)], { type: this.mimeType }) });
  }
}

class FakeMediaStream {
  private readonly tracks: MediaStreamTrack[];

  constructor(tracks: MediaStreamTrack[]) {
    this.tracks = tracks;
  }

  getTracks() {
    return this.tracks;
  }
}

// --- helpers ---

function makeTrack(kind: "video" | "audio"): MediaStreamTrack {
  return { kind, readyState: "live" } as unknown as MediaStreamTrack;
}

function makeEndedTrack(kind: "video" | "audio"): MediaStreamTrack {
  return { kind, readyState: "ended" } as unknown as MediaStreamTrack;
}

function makeStream(tracks: MediaStreamTrack[]): MediaStream {
  return { getTracks: () => tracks } as unknown as MediaStream;
}

function fireTrackEnded(track: MediaStreamTrack) {
  const onended = (track as { onended: ((event: Event) => void) | null }).onended;
  onended?.(new Event("ended"));
}

function renderRecorder(
  overrides?: Partial<{
    videoStream: MediaStream | null;
    audioStream: MediaStream | null;
    roomSlug: string;
  }>,
) {
  return renderHook(() =>
    useLocalRecorder({
      videoStream: makeStream([makeTrack("video")]),
      audioStream: makeStream([makeTrack("audio")]),
      roomSlug: "my-room",
      ...overrides,
    }),
  );
}

// --- subject ---

const createObjectURL = vi.fn((_blob: Blob | MediaSource) => "blob:mock-url");
const revokeObjectURL = vi.fn();
let clickedAnchors: HTMLAnchorElement[] = [];

describe("useLocalRecorder", () => {
  beforeEach(() => {
    FakeMediaRecorder.instances = [];
    FakeMediaRecorder.isTypeSupported.mockReset().mockImplementation(() => true);
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    clickedAnchors = [];
    Object.defineProperty(window.URL, "createObjectURL", {
      value: createObjectURL,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      value: revokeObjectURL,
      writable: true,
      configurable: true,
    });
    vi.spyOn(HTMLElement.prototype, "click").mockImplementation(function (this: HTMLElement) {
      clickedAnchors.push(this as HTMLAnchorElement);
    });
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    vi.stubGlobal("MediaStream", FakeMediaStream);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("reports unsupported when MediaRecorder is missing", () => {
    vi.stubGlobal("MediaRecorder", undefined);
    const { result } = renderRecorder();
    expect(result.current.isSupported).toBe(false);
  });

  it("reports unsupported when no webm type is available and start is a no-op", () => {
    FakeMediaRecorder.isTypeSupported.mockReset().mockImplementation(() => false);
    const { result } = renderRecorder();
    expect(result.current.isSupported).toBe(false);
    act(() => {
      result.current.start();
    });
    expect(FakeMediaRecorder.instances).toHaveLength(0);
    expect(result.current.state).toBe("idle");
  });

  it("negotiates vp9 first when available", () => {
    FakeMediaRecorder.isTypeSupported.mockReset().mockImplementation((mimeType: string) => {
      return mimeType === "video/webm;codecs=vp9,opus";
    });
    const { result } = renderRecorder();
    expect(result.current.isSupported).toBe(true);
    FakeMediaRecorder.isTypeSupported.mockClear();
    act(() => {
      result.current.start();
    });
    expect(FakeMediaRecorder.instances).toHaveLength(1);
    expect(FakeMediaRecorder.instances[0].mimeType).toBe("video/webm;codecs=vp9,opus");
    expect(FakeMediaRecorder.isTypeSupported.mock.calls[0][0]).toBe("video/webm;codecs=vp9,opus");
  });

  it("falls back to vp8 then plain webm in order", () => {
    FakeMediaRecorder.isTypeSupported.mockReset().mockImplementation((mimeType: string) => {
      return mimeType === "video/webm;codecs=vp8,opus";
    });
    const vp8 = renderRecorder();
    expect(vp8.result.current.isSupported).toBe(true);
    FakeMediaRecorder.isTypeSupported.mockClear();
    act(() => {
      vp8.result.current.start();
    });
    expect(FakeMediaRecorder.instances[0].mimeType).toBe("video/webm;codecs=vp8,opus");
    expect(FakeMediaRecorder.isTypeSupported.mock.calls.map((call) => call[0])).toEqual([
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
    ]);

    FakeMediaRecorder.instances = [];
    FakeMediaRecorder.isTypeSupported.mockReset().mockImplementation((mimeType: string) => {
      return mimeType === "video/webm";
    });
    const webm = renderRecorder();
    FakeMediaRecorder.isTypeSupported.mockClear();
    act(() => {
      webm.result.current.start();
    });
    expect(FakeMediaRecorder.instances[0].mimeType).toBe("video/webm");
    expect(FakeMediaRecorder.isTypeSupported.mock.calls.map((call) => call[0])).toEqual([
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ]);
  });

  it("combines live video and audio tracks into one stream at start", () => {
    const { result } = renderRecorder();
    act(() => {
      result.current.start();
    });
    expect(result.current.state).toBe("recording");
    const recorder = FakeMediaRecorder.instances[0];
    expect(recorder.startTimeslice).toBe(1000);
    const combined = recorder.stream as unknown as { getTracks(): MediaStreamTrack[] };
    expect(combined.getTracks().map((track) => track.kind)).toEqual(["video", "audio"]);
  });

  it("records audio only when the camera stream is absent", () => {
    const { result } = renderRecorder({ videoStream: null });
    act(() => {
      result.current.start();
    });
    const combined = FakeMediaRecorder.instances[0].stream as unknown as {
      getTracks(): MediaStreamTrack[];
    };
    expect(combined.getTracks().map((track) => track.kind)).toEqual(["audio"]);
  });

  it("records video only when the microphone stream is absent", () => {
    const { result } = renderRecorder({ audioStream: null });
    act(() => {
      result.current.start();
    });
    const combined = FakeMediaRecorder.instances[0].stream as unknown as {
      getTracks(): MediaStreamTrack[];
    };
    expect(combined.getTracks().map((track) => track.kind)).toEqual(["video"]);
  });

  it("start is a no-op when no stream has live tracks", () => {
    const { result } = renderRecorder({
      videoStream: makeStream([makeEndedTrack("video")]),
      audioStream: makeStream([makeEndedTrack("audio")]),
    });
    act(() => {
      result.current.start();
    });
    expect(FakeMediaRecorder.instances).toHaveLength(0);
    expect(result.current.state).toBe("idle");
  });

  it("buffers chunks and downloads one webm on stop", () => {
    const { result } = renderRecorder();
    act(() => {
      result.current.start();
    });
    const recorder = FakeMediaRecorder.instances[0];
    act(() => {
      recorder.emitData(100);
      recorder.emitData(50);
    });
    act(() => {
      result.current.stop();
    });

    expect(result.current.state).toBe("idle");
    expect(createObjectURL).toHaveBeenCalledOnce();
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.size).toBe(150);
    expect(blob.type).toBe("video/webm;codecs=vp9,opus");
    expect(clickedAnchors).toHaveLength(1);
    expect(clickedAnchors[0].download).toMatch(/^zvonok-my-room-\d{4}-\d{2}-\d{2}-\d{4}\.webm$/);
    expect(clickedAnchors[0].href).toBe("blob:mock-url");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("sanitizes the room slug in the file name", () => {
    const { result } = renderRecorder({ roomSlug: "my room/slug!!" });
    act(() => {
      result.current.start();
    });
    act(() => {
      FakeMediaRecorder.instances[0].emitData(10);
      result.current.stop();
    });
    expect(clickedAnchors[0].download).toMatch(
      /^zvonok-my-room-slug-\d{4}-\d{2}-\d{2}-\d{4}\.webm$/,
    );
  });

  it("names the file with the start timestamp, not the stop time", () => {
    vi.useFakeTimers({ now: new Date("2026-03-05T14:07:30") });
    const { result } = renderRecorder();
    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000);
      FakeMediaRecorder.instances[0].emitData(10);
      result.current.stop();
    });
    expect(clickedAnchors[0].download).toContain("zvonok-my-room-2026-03-05-1407.webm");
  });

  it("stops and saves when a recorded track ends", () => {
    const videoTrack = makeTrack("video");
    const audioTrack = makeTrack("audio");
    const { result } = renderRecorder({
      videoStream: makeStream([videoTrack]),
      audioStream: makeStream([audioTrack]),
    });
    act(() => {
      result.current.start();
    });
    act(() => {
      FakeMediaRecorder.instances[0].emitData(80);
      fireTrackEnded(audioTrack);
    });

    expect(FakeMediaRecorder.instances[0].state).toBe("inactive");
    expect(result.current.state).toBe("idle");
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect((createObjectURL.mock.calls[0][0] as Blob).size).toBe(80);
    expect(clickedAnchors[0].download).toMatch(/^zvonok-my-room-\d{4}-\d{2}-\d{2}-\d{4}\.webm$/);
  });

  it("stops and saves on unmount while recording", () => {
    const { result, unmount } = renderRecorder();
    act(() => {
      result.current.start();
    });
    act(() => {
      FakeMediaRecorder.instances[0].emitData(40);
    });
    unmount();

    expect(FakeMediaRecorder.instances[0].state).toBe("inactive");
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect((createObjectURL.mock.calls[0][0] as Blob).size).toBe(40);
  });

  it("does not save twice when a track ends after a manual stop", () => {
    const audioTrack = makeTrack("audio");
    const { result } = renderRecorder({
      videoStream: null,
      audioStream: makeStream([audioTrack]),
    });
    act(() => {
      result.current.start();
    });
    act(() => {
      FakeMediaRecorder.instances[0].emitData(10);
      result.current.stop();
    });
    act(() => {
      fireTrackEnded(audioTrack);
    });
    expect(createObjectURL).toHaveBeenCalledOnce();
  });

  it("derives elapsed seconds from the start timestamp and zeroes on stop", () => {
    vi.useFakeTimers({ now: new Date("2026-03-05T10:00:00") });
    const { result } = renderRecorder();
    act(() => {
      result.current.start();
    });
    expect(result.current.elapsedSeconds).toBe(0);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.elapsedSeconds).toBe(1);
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(result.current.elapsedSeconds).toBe(3);
    act(() => {
      result.current.stop();
    });
    expect(result.current.elapsedSeconds).toBe(0);
  });
});
