import { computeLayout } from "@zvonok/video-layout";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CallRecordingCompositor, type RecordingSource } from "../call-recording-compositor";

// --- fakes (jsdom has no canvas/video/captureStream) ---

interface DrawCall {
  args: unknown[];
}

class FakeRenderingContext2D {
  readonly drawCalls: DrawCall[] = [];
  readonly fillRects: Array<{ x: number; y: number; w: number; h: number }> = [];
  readonly strokeRects: Array<{ x: number; y: number; w: number; h: number }> = [];
  readonly texts: string[] = [];
  readonly scaledTransforms: Array<[number, number]> = [];
  font = "";
  fillStyle = "";
  strokeStyle = "";
  lineWidth = 1;
  textAlign = "";
  textBaseline = "";

  drawImage(...args: unknown[]) {
    this.drawCalls.push({ args });
  }

  readonly roundRects: Array<{ x: number; y: number; w: number; h: number }> = [];

  fillRect(x: number, y: number, w: number, h: number) {
    this.fillRects.push({ x, y, w, h });
  }

  roundRect(x: number, y: number, w: number, h: number) {
    this.roundRects.push({ x, y, w, h });
  }

  strokeRect(x: number, y: number, w: number, h: number) {
    this.strokeRects.push({ x, y, w, h });
  }

  fillText(text: string) {
    this.texts.push(text);
  }

  beginPath() {}

  fill() {}

  translate() {}

  scale(x: number, y: number) {
    this.scaledTransforms.push([x, y]);
  }

  save() {}

  restore() {}

  measureText(text: string) {
    return { width: text.length * 7 } as TextMetrics;
  }
}

function makeStream(hasVideo: boolean): MediaStream {
  return {
    getVideoTracks: () => (hasVideo ? [{ readyState: "live", muted: false }] : []),
    getAudioTracks: () => [],
  } as unknown as MediaStream;
}

function makeSource(overrides: Partial<RecordingSource> = {}): RecordingSource {
  return {
    id: "user-1",
    label: "Alice",
    stream: makeStream(true),
    isLocal: false,
    isScreen: false,
    ...overrides,
  };
}

// --- subject ---

describe("CallRecordingCompositor", () => {
  let context: FakeRenderingContext2D;
  const createdVideos: HTMLVideoElement[] = [];
  const captureStreams: MediaStream[] = [];

  beforeEach(() => {
    context = new FakeRenderingContext2D();
    createdVideos.length = 0;
    captureStreams.length = 0;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );
    Object.defineProperty(HTMLCanvasElement.prototype, "captureStream", {
      value: () => {
        const stream = { getTracks: () => [] } as unknown as MediaStream;
        captureStreams.push(stream);
        return stream;
      },
      configurable: true,
      writable: true,
    });
    vi.spyOn(HTMLVideoElement.prototype, "play").mockImplementation(async () => {
      return undefined as never;
    });
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
      if (tagName === "video") {
        const video = originalCreateElement("video") as HTMLVideoElement;
        Object.defineProperty(video, "videoWidth", { value: 1280 });
        Object.defineProperty(video, "videoHeight", { value: 720 });
        createdVideos.push(video);
        return video;
      }
      return originalCreateElement(tagName);
    }) as typeof document.createElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderDestinations(compositor: CallRecordingCompositor): Array<number[]> {
    compositor.renderFrame();
    return context.drawCalls.map((call) => {
      const args = call.args as number[];
      return args.slice(-4);
    });
  }

  it("draws each camera source into its computed grid tile", () => {
    const compositor = new CallRecordingCompositor();
    compositor.setSources([
      makeSource({ id: "a", label: "Alice" }),
      makeSource({ id: "b", label: "Bob" }),
    ]);

    const layout = computeLayout({
      containerWidth: 1280,
      containerHeight: 720,
      participantCount: 2,
      spotlight: false,
    });
    const destinations = renderDestinations(compositor);

    expect(layout.tiles).toHaveLength(2);
    for (const tile of layout.tiles) {
      const inside = destinations.some(
        ([dx, dy, dw, dh]) =>
          dx >= tile.x &&
          dy >= tile.y &&
          dx + dw <= tile.x + tile.width + 1 &&
          dy + dh <= tile.y + tile.height + 1,
      );
      expect(inside).toBe(true);
    }
  });

  it("draws a screen share into the spotlight area with participants in the strip", () => {
    const compositor = new CallRecordingCompositor();
    compositor.setSources([
      makeSource({ id: "a", label: "Alice" }),
      makeSource({ id: "b", label: "Bob" }),
      makeSource({ id: "screen:a", label: "Alice", stream: makeStream(true), isScreen: true }),
    ]);

    const layout = computeLayout({
      containerWidth: 1280,
      containerHeight: 720,
      participantCount: 2,
      spotlight: true,
    });
    const destinations = renderDestinations(compositor);
    const area = layout.spotlightArea!;

    const inSpotlight = destinations.some(
      ([dx, dy, dw, dh]) =>
        dx >= area.x - 1 &&
        dy >= area.y - 1 &&
        dx + dw <= area.x + area.width + 1 &&
        dy + dh <= area.y + area.height + 1,
    );
    expect(inSpotlight).toBe(true);
    expect(context.drawCalls).toHaveLength(3);
  });

  it("keeps grid layout without spotlight when the screen source has no live video", () => {
    const compositor = new CallRecordingCompositor();
    compositor.setSources([
      makeSource({ id: "a", label: "Alice" }),
      makeSource({ id: "screen:a", label: "Alice", stream: makeStream(false), isScreen: true }),
    ]);

    const destinations = renderDestinations(compositor);
    expect(destinations).toHaveLength(1);
  });

  it("renders an initials placeholder for sources without video", () => {
    const compositor = new CallRecordingCompositor();
    compositor.setSources([
      makeSource({ id: "a", label: "Alice Baker", stream: makeStream(false) }),
    ]);
    compositor.renderFrame();

    expect(context.texts).toContain("AB");
    expect(context.drawCalls).toHaveLength(0);
  });

  it("mirrors the local participant tile", () => {
    const compositor = new CallRecordingCompositor();
    compositor.setSources([makeSource({ id: "me", label: "Me", isLocal: true })]);
    compositor.renderFrame();

    expect(context.scaledTransforms).toContainEqual([-1, 1]);
  });

  it("diffs video elements by source id on setSources", () => {
    const compositor = new CallRecordingCompositor();
    compositor.setSources([makeSource({ id: "a" }), makeSource({ id: "b", label: "Bob" })]);
    expect(createdVideos).toHaveLength(2);

    compositor.setSources([makeSource({ id: "a" }), makeSource({ id: "c", label: "Cara" })]);
    expect(createdVideos).toHaveLength(3);

    const stale = createdVideos.find((video) => video.srcObject === null);
    expect(stale).toBeDefined();
  });

  it("start returns a capture stream and stop releases it", () => {
    const compositor = new CallRecordingCompositor();
    compositor.setSources([makeSource({ id: "a" })]);
    const stream = compositor.start();

    expect(stream).toBe(captureStreams[0]);

    const tracks = [{ stop: vi.fn() }] as unknown as MediaStreamTrack[];
    (stream as unknown as { getTracks: () => MediaStreamTrack[] }).getTracks = () => tracks;
    compositor.stop();

    expect(tracks[0].stop).toHaveBeenCalledOnce();
    expect(captureStreams).toHaveLength(1);
  });

  it("letterboxes the screen share to keep all shared content visible", () => {
    const compositor = new CallRecordingCompositor();
    compositor.setSources([
      makeSource({ id: "a", label: "Alice" }),
      makeSource({ id: "screen:a", label: "Alice", isScreen: true }),
    ]);
    compositor.renderFrame();

    // The contain draw passes (image, x, y, w, h); camera draws pass 9 args.
    const spotlightArgs = context.drawCalls
      .map((call) => call.args as number[])
      .find((args) => args.length === 5);
    expect(spotlightArgs).toBeDefined();
    const [dx, dy, dw, dh] = spotlightArgs!.slice(1);
    // Spotlight area is 1112x720; a 1280x720 share scales to 1112x625.5, centered.
    expect(dw).toBeCloseTo(1112);
    expect(dh).toBeCloseTo(625.5);
    expect(dx).toBeCloseTo(0);
    expect(dy).toBeCloseTo(47.25);
  });

  it("ellipsizes labels wider than their tile", () => {
    const compositor = new CallRecordingCompositor();
    compositor.setSources([
      makeSource({ id: "screen:me", label: "Share", isScreen: true }),
      makeSource({ id: "bob", label: "Bob von Longdisplayname-Constantinople" }),
      makeSource({ id: "alice", label: "Alice" }),
    ]);
    compositor.renderFrame();

    const ellipsized = context.texts.filter((text) => text.endsWith("…"));
    expect(ellipsized).toHaveLength(1);
    // Strip tile 160px: max text 128px = 18 chars at the fake's 7px/char
    // measure, so 17 chars + ellipsis.
    expect(ellipsized[0].length).toBe(18);
    expect(context.texts).toContain("Alice");
    // Pill measures the ellipsized text (17 chars + … = 18*7) plus padding,
    // and stays within the 160px tile minus insets.
    const pill = context.roundRects.find(({ w }) => w === 18 * 7 + 16);
    expect(pill).toBeDefined();
    expect(pill!.w).toBeLessThanOrEqual(160 - 16);
  });

  it("outlines every rendered tile with a border", () => {
    const compositor = new CallRecordingCompositor();
    compositor.setSources([
      makeSource({ id: "a", label: "Alice" }),
      makeSource({ id: "b", label: "Bob", stream: makeStream(false) }),
    ]);
    compositor.renderFrame();

    expect(context.strokeRects).toHaveLength(2);
    for (const rect of context.strokeRects) {
      expect(rect.w).toBeGreaterThan(0);
      expect(rect.h).toBeGreaterThan(0);
    }
  });
});
