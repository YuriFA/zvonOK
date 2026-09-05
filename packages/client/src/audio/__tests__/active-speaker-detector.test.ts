import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActiveSpeakerDetector } from "../active-speaker-detector";

describe("ActiveSpeakerDetector", () => {
  let detector: ActiveSpeakerDetector;

  beforeEach(() => {
    vi.useFakeTimers();
    detector = new ActiveSpeakerDetector({
      speakingThreshold: 0.01,
      holdTime: 800,
      switchMargin: 1.3,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when no one is speaking", () => {
    const levels = new Map([["user-1", 0.001]]);
    expect(detector.detect(levels)).toBeNull();
  });

  it("returns null for empty levels map", () => {
    expect(detector.detect(new Map())).toBeNull();
  });

  it("detects first speaker above threshold", () => {
    const levels = new Map([["user-1", 0.05]]);
    expect(detector.detect(levels)).toBe("user-1");
  });

  it("keeps same speaker on subsequent detects", () => {
    detector.detect(new Map([["user-1", 0.05]]));
    const result = detector.detect(new Map([["user-1", 0.04]]));
    expect(result).toBe("user-1");
  });

  it("does not switch speaker before holdTime elapsed", () => {
    detector.detect(new Map([["user-1", 0.05]]));

    vi.advanceTimersByTime(400);

    const result = detector.detect(
      new Map([
        ["user-1", 0.05],
        ["user-2", 0.1],
      ]),
    );
    expect(result).toBe("user-1");
  });

  it("switches speaker after holdTime if new speaker is louder by margin", () => {
    detector.detect(new Map([["user-1", 0.05]]));

    vi.advanceTimersByTime(900);

    const result = detector.detect(
      new Map([
        ["user-1", 0.05],
        ["user-2", 0.1],
      ]),
    );
    expect(result).toBe("user-2");
  });

  it("does not switch if new speaker is not louder by margin", () => {
    detector.detect(new Map([["user-1", 0.05]]));

    vi.advanceTimersByTime(900);

    const result = detector.detect(
      new Map([
        ["user-1", 0.05],
        ["user-2", 0.06],
      ]),
    );
    expect(result).toBe("user-1");
  });

  it("clears active speaker after holdTime of silence", () => {
    detector.detect(new Map([["user-1", 0.05]]));

    vi.advanceTimersByTime(100);
    detector.detect(new Map());
    vi.advanceTimersByTime(900);

    const result = detector.detect(new Map());
    expect(result).toBeNull();
  });

  it("keeps active speaker during silence before holdTime", () => {
    detector.detect(new Map([["user-1", 0.05]]));

    vi.advanceTimersByTime(100);
    const result = detector.detect(new Map());
    expect(result).toBe("user-1");
  });

  it("resets state", () => {
    detector.detect(new Map([["user-1", 0.05]]));
    detector.reset();
    expect(detector.detect(new Map())).toBeNull();
  });

  it("uses default options when none provided", () => {
    const defaultDetector = new ActiveSpeakerDetector();
    const result = defaultDetector.detect(new Map([["user-1", 0.01]]));
    expect(result).toBe("user-1");
  });
});
