/**
 * Mixes every participating audio stream into a single track using WebAudio.
 * Tapping a stream into the mix runs in parallel to its `<audio>` playback,
 * so room monitoring behavior is unaffected.
 *
 * The `AudioContext` is created on `start()` - the record click - so the
 * browser's user-gesture autoplay policy is satisfied.
 */
export interface CallAudioMixerStream {
  /** Stable identity of the stream (user id). */
  id: string;
  stream: MediaStream;
}

export class CallAudioMixer {
  private context: AudioContext | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private nodes = new Map<string, MediaStreamAudioSourceNode>();

  /** Creates the audio graph (once) and returns the mixed audio stream. */
  start(): MediaStream {
    if (this.context === null) {
      this.context = new AudioContext();
      this.destination = this.context.createMediaStreamDestination();
    }
    void this.context.resume().catch(() => {
      // Resume can reject without a gesture in edge cases; the mix degrades
      // to silence rather than failing the recording.
    });
    return this.destination!.stream;
  }

  /** Diff the previous streams against the new ones, rewiring source nodes. */
  setStreams(streams: CallAudioMixerStream[]): void {
    if (this.context === null || this.destination === null) {
      return;
    }
    const nextIds = new Set(streams.map((entry) => entry.id));
    for (const [id, node] of this.nodes) {
      if (!nextIds.has(id)) {
        node.disconnect();
        this.nodes.delete(id);
      }
    }
    for (const entry of streams) {
      if (this.nodes.has(entry.id)) {
        continue;
      }
      if (
        typeof entry.stream.getAudioTracks !== "function" ||
        entry.stream.getAudioTracks().length === 0
      ) {
        continue;
      }
      const node = this.context.createMediaStreamSource(entry.stream);
      node.connect(this.destination);
      this.nodes.set(entry.id, node);
    }
  }

  stop(): void {
    for (const node of this.nodes.values()) {
      node.disconnect();
    }
    this.nodes.clear();
    void this.context?.close().catch(() => {
      // Closing an already-interrupted context is safe to ignore.
    });
    this.context = null;
    this.destination = null;
  }
}
