import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CallAudioMixer } from "../call-audio-mixer";

// --- fakes (jsdom has no WebAudio) ---

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];

  destinationNode: { stream: { getAudioTracks: () => unknown[] } } | null = null;

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createMediaStreamSource = vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));

  createMediaStreamDestination() {
    if (this.destinationNode === null) {
      this.destinationNode = { stream: { getAudioTracks: () => [{}] } };
    }
    return this.destinationNode;
  }

  resume = vi.fn(async () => undefined);

  close = vi.fn(async () => undefined);
}

function makeStream(audioTracks: number): MediaStream {
  return {
    getAudioTracks: () => Array.from({ length: audioTracks }, () => ({})),
    getVideoTracks: () => [],
  } as unknown as MediaStream;
}

describe("CallAudioMixer", () => {
  beforeEach(() => {
    FakeAudioContext.instances = [];
    vi.stubGlobal("AudioContext", FakeAudioContext);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates one context on start and returns the destination stream", () => {
    const mixer = new CallAudioMixer();
    const stream = mixer.start();

    expect(FakeAudioContext.instances).toHaveLength(1);
    expect(stream.getAudioTracks()).toHaveLength(1);
  });

  it("reuses the context across start calls and resumes it", () => {
    const mixer = new CallAudioMixer();
    mixer.start();
    mixer.start();

    expect(FakeAudioContext.instances).toHaveLength(1);
    expect(FakeAudioContext.instances[0].resume).toHaveBeenCalledTimes(2);
  });

  it("wires one source node per stream into the shared destination", () => {
    const mixer = new CallAudioMixer();
    mixer.start();
    const context = FakeAudioContext.instances[0];
    mixer.setStreams([
      { id: "me", stream: makeStream(1) },
      { id: "peer-1", stream: makeStream(1) },
    ]);

    expect(context.createMediaStreamSource).toHaveBeenCalledTimes(2);
    for (const result of context.createMediaStreamSource.mock.results) {
      expect(result.value.connect).toHaveBeenCalledWith(context.destinationNode);
    }
  });

  it("skips streams without audio tracks", () => {
    const mixer = new CallAudioMixer();
    mixer.start();
    const context = FakeAudioContext.instances[0];
    mixer.setStreams([
      { id: "silent", stream: makeStream(0) },
      { id: "voice", stream: makeStream(1) },
    ]);

    expect(context.createMediaStreamSource).toHaveBeenCalledTimes(1);
  });

  it("disconnects removed streams on diff", () => {
    const mixer = new CallAudioMixer();
    mixer.start();
    const context = FakeAudioContext.instances[0];
    mixer.setStreams([
      { id: "me", stream: makeStream(1) },
      { id: "peer-1", stream: makeStream(1) },
    ]);
    const peerNode = context.createMediaStreamSource.mock.results[1].value;

    mixer.setStreams([{ id: "me", stream: makeStream(1) }]);

    expect(peerNode.disconnect).toHaveBeenCalledTimes(1);
  });

  it("does not rewire an unchanged stream twice", () => {
    const mixer = new CallAudioMixer();
    mixer.start();
    const context = FakeAudioContext.instances[0];
    mixer.setStreams([{ id: "me", stream: makeStream(1) }]);
    mixer.setStreams([{ id: "me", stream: makeStream(1) }]);

    expect(context.createMediaStreamSource).toHaveBeenCalledTimes(1);
  });

  it("ignores setStreams before start", () => {
    const mixer = new CallAudioMixer();
    expect(() => mixer.setStreams([{ id: "me", stream: makeStream(1) }])).not.toThrow();
  });

  it("stops by disconnecting sources and closing the context", () => {
    const mixer = new CallAudioMixer();
    mixer.start();
    const context = FakeAudioContext.instances[0];
    mixer.setStreams([{ id: "me", stream: makeStream(1) }]);
    const node = context.createMediaStreamSource.mock.results[0].value;

    mixer.stop();

    expect(node.disconnect).toHaveBeenCalled();
    expect(context.close).toHaveBeenCalledTimes(1);

    // A subsequent start builds a fresh graph.
    mixer.start();
    expect(FakeAudioContext.instances).toHaveLength(2);
  });
});
