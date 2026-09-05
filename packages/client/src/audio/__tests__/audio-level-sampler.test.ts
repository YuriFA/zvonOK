import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAnalyserNode = () => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  fftSize: 0,
  smoothingTimeConstant: 0,
  frequencyBinCount: 128,
  getByteTimeDomainData: vi.fn((arr: Uint8Array) => {
    arr.fill(128);
  }),
});

const mockGainNode = () => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  gain: { value: 1.0 },
});

const mockSourceNode = () => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
});

const mockAudioContext = () => {
  const analyser = mockAnalyserNode();
  const gain = mockGainNode();
  const source = mockSourceNode();
  return {
    resume: vi.fn(),
    close: vi.fn(),
    createAnalyser: vi.fn(() => analyser),
    createGain: vi.fn(() => gain),
    createMediaStreamSource: vi.fn(() => source),
    destination: {},
    _analyser: analyser,
    _gain: gain,
    _source: source,
  };
};

let ctx: ReturnType<typeof mockAudioContext>;

vi.stubGlobal(
  "AudioContext",
  class {
    resume = ctx.resume;
    close = ctx.close;
    createAnalyser = ctx.createAnalyser;
    createGain = ctx.createGain;
    createMediaStreamSource = ctx.createMediaStreamSource;
    destination = ctx.destination;
  },
);

const mockStream = (hasAudio = true) =>
  ({
    getAudioTracks: () => (hasAudio ? [{ kind: "audio" }] : []),
  }) as unknown as MediaStream;

describe("AudioLevelSampler", () => {
  let sampler: InstanceType<typeof import("../audio-level-sampler").AudioLevelSampler>;

  beforeEach(async () => {
    ctx = mockAudioContext();
    const { AudioLevelSampler } = await import("../audio-level-sampler");
    sampler = new AudioLevelSampler();
  });

  afterEach(() => {
    sampler.dispose();
  });

  describe("addOwned", () => {
    it("creates AudioContext and analyser chain", () => {
      sampler.addOwned("user-1", mockStream());

      expect(ctx.resume).toHaveBeenCalled();
      expect(ctx.createAnalyser).toHaveBeenCalled();
      expect(ctx.createGain).toHaveBeenCalled();
      expect(ctx.createMediaStreamSource).toHaveBeenCalled();
      expect(sampler.ids()).toEqual(["user-1"]);
    });

    it("skips streams without audio tracks", () => {
      sampler.addOwned("user-1", mockStream(false));
      expect(sampler.ids()).toEqual([]);
    });

    it("replaces existing entry with same id", () => {
      sampler.addOwned("user-1", mockStream());
      sampler.addOwned("user-1", mockStream());
      expect(sampler.ids()).toEqual(["user-1"]);
      expect(ctx.close).toHaveBeenCalled();
    });
  });

  describe("addBorrowed", () => {
    it("stores borrowed analyser reference", () => {
      const analyser = mockAnalyserNode();
      sampler.addBorrowed("user-2", analyser as unknown as AnalyserNode);
      expect(sampler.ids()).toEqual(["user-2"]);
    });

    it("does not replace if same analyser reference", () => {
      const analyser = mockAnalyserNode();
      sampler.addBorrowed("user-2", analyser as unknown as AnalyserNode);
      sampler.addBorrowed("user-2", analyser as unknown as AnalyserNode);
      expect(sampler.ids()).toEqual(["user-2"]);
    });
  });

  describe("remove", () => {
    it("disconnects owned nodes and closes context", () => {
      sampler.addOwned("user-1", mockStream());
      sampler.remove("user-1");
      expect(ctx._source.disconnect).toHaveBeenCalled();
      expect(ctx._analyser.disconnect).toHaveBeenCalled();
      expect(ctx._gain.disconnect).toHaveBeenCalled();
      expect(ctx.close).toHaveBeenCalled();
      expect(sampler.ids()).toEqual([]);
    });

    it("removes borrowed entry without cleanup", () => {
      const analyser = mockAnalyserNode();
      sampler.addBorrowed("user-2", analyser as unknown as AnalyserNode);
      sampler.remove("user-2");
      expect(sampler.ids()).toEqual([]);
    });

    it("is a no-op for unknown id", () => {
      expect(() => sampler.remove("unknown")).not.toThrow();
    });
  });

  describe("sample", () => {
    it("returns map with levels for all entries", () => {
      const analyser = mockAnalyserNode();
      analyser.getByteTimeDomainData = vi.fn((arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) arr[i] = 160;
      });
      sampler.addBorrowed("user-1", analyser as unknown as AnalyserNode);

      const levels = sampler.sample();
      expect(levels.has("user-1")).toBe(true);
      expect(levels.get("user-1")).toBeGreaterThanOrEqual(0);
    });

    it("returns empty map when no entries", () => {
      const levels = sampler.sample();
      expect(levels.size).toBe(0);
    });

    it("applies EMA smoothing across samples", () => {
      const analyser = mockAnalyserNode();
      let callCount = 0;
      analyser.getByteTimeDomainData = vi.fn((arr: Uint8Array) => {
        callCount++;
        if (callCount === 1) {
          for (let i = 0; i < arr.length; i++) arr[i] = 160;
        } else {
          for (let i = 0; i < arr.length; i++) arr[i] = 180;
        }
      });
      sampler.addBorrowed("user-1", analyser as unknown as AnalyserNode);

      const first = sampler.sample();
      const second = sampler.sample();

      expect(second.get("user-1")).not.toBe(first.get("user-1"));
    });
  });

  describe("clear", () => {
    it("removes all entries", () => {
      sampler.addOwned("user-1", mockStream());
      const analyser = mockAnalyserNode();
      sampler.addBorrowed("user-2", analyser as unknown as AnalyserNode);

      sampler.clear();
      expect(sampler.ids()).toEqual([]);
    });
  });

  describe("dispose", () => {
    it("clears all entries and smoothed data", () => {
      sampler.addOwned("user-1", mockStream());
      sampler.dispose();
      expect(sampler.ids()).toEqual([]);
    });
  });
});
