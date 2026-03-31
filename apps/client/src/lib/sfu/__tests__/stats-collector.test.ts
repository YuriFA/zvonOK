import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SfuStatsCollector } from "../stats-collector";

function createMockConsumer(id: string, producerId: string, kind: "audio" | "video") {
  return {
    id,
    producerId,
    kind,
    getStats: vi.fn().mockResolvedValue(new Map()),
    on: vi.fn(),
    close: vi.fn(),
  };
}

function createMockTransport() {
  return {
    getStats: vi.fn().mockResolvedValue(
      new Map([
        [
          "pair-1",
          {
            type: "candidate-pair",
            state: "succeeded",
            currentRoundTripTime: 0.02,
            packetsReceived: 1000,
            packetsLost: 5,
          },
        ],
      ]),
    ),
    on: vi.fn(),
    close: vi.fn(),
  } as unknown;
}

describe("SfuStatsCollector", () => {
  let collector: SfuStatsCollector;
  let mockTransport: ReturnType<typeof createMockTransport>;
  let consumers: Map<string, object>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockTransport = createMockTransport();
    consumers = new Map();

    collector = new SfuStatsCollector(
      () => mockTransport as unknown as import("mediasoup-client/types").Transport,
      () =>
        consumers.entries() as unknown as Iterable<
          [string, import("mediasoup-client/types").Consumer]
        >,
      (producerId: string) => {
        if (producerId === "prod-1") return "user-1";
        return undefined;
      },
    );
  });

  afterEach(() => {
    collector.stop();
    vi.useRealTimers();
  });

  it("does not start a second interval if already running", () => {
    collector.start(1000);
    collector.start(1000);
    collector.stop();
    expect(() => vi.advanceTimersByTime(2000)).not.toThrow();
  });

  it("stops cleanly when no interval is running", () => {
    expect(() => collector.stop()).not.toThrow();
  });

  it("notifies subscribers with stats", async () => {
    const consumer = createMockConsumer("c-1", "prod-1", "video");
    consumer.getStats = vi.fn().mockResolvedValue(
      new Map([
        [
          "rtp-1",
          {
            type: "inbound-rtp",
            kind: "video",
            bitrate: 500000,
            frameWidth: 1280,
            frameHeight: 720,
            framesPerSecond: 30,
          },
        ],
      ]),
    );
    consumers.set("c-1", consumer);

    const statsCallback = vi.fn();
    collector.onStats(statsCallback);
    collector.start(1000);

    await vi.advanceTimersByTimeAsync(1000);

    expect(statsCallback).toHaveBeenCalled();
    const statsMap = statsCallback.mock.calls[0][0] as Map<string, object>;
    expect(statsMap.has("user-1")).toBe(true);
  });

  it("skips consumers with no matching peer", async () => {
    const consumer = createMockConsumer("c-1", "prod-unknown", "video");
    consumers.set("c-1", consumer);

    const statsCallback = vi.fn();
    collector.onStats(statsCallback);
    collector.start(1000);

    await vi.advanceTimersByTimeAsync(1000);

    expect(statsCallback).not.toHaveBeenCalled();
  });

  it("skips collection when no recv transport", async () => {
    const noTransportCollector = new SfuStatsCollector(
      () => null,
      () =>
        consumers.entries() as unknown as Iterable<
          [string, import("mediasoup-client/types").Consumer]
        >,
      () => "user-1",
    );

    const statsCallback = vi.fn();
    noTransportCollector.onStats(statsCallback);
    noTransportCollector.start(1000);

    await vi.advanceTimersByTimeAsync(1000);

    expect(statsCallback).not.toHaveBeenCalled();
    noTransportCollector.stop();
  });

  it("unsubscribes from stats callback", async () => {
    const statsCallback = vi.fn();
    const unsubscribe = collector.onStats(statsCallback);
    unsubscribe();

    collector.start(1000);
    await vi.advanceTimersByTimeAsync(1000);

    expect(statsCallback).not.toHaveBeenCalled();
  });

  it("uses default interval of 2000ms", async () => {
    const statsCallback = vi.fn();
    collector.onStats(statsCallback);
    collector.start();

    await vi.advanceTimersByTimeAsync(1999);
    expect(statsCallback).not.toHaveBeenCalled();
  });
});
