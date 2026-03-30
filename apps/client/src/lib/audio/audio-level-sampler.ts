import { calculateRmsLevel } from './audio-utils';

interface OwnedEntry {
  type: 'owned';
  context: AudioContext;
  analyser: AnalyserNode;
  source: MediaStreamAudioSourceNode;
  silentGain: GainNode;
}

interface BorrowedEntry {
  type: 'borrowed';
  analyser: AnalyserNode;
}

type Entry = OwnedEntry | BorrowedEntry;

export class AudioLevelSampler {
  private entries = new Map<string, Entry>();
  private smoothed = new Map<string, number>();
  private smoothFactor = 0.3;

  addOwned(id: string, stream: MediaStream): void {
    this.remove(id);

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    try {
      const context = new AudioContext();
      void context.resume();

      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;

      const source = context.createMediaStreamSource(stream);
      source.connect(analyser);

      const silentGain = context.createGain();
      silentGain.gain.value = 0;
      analyser.connect(silentGain);
      silentGain.connect(context.destination);

      this.entries.set(id, { type: 'owned', context, analyser, source, silentGain });
    } catch {
      // ignore
    }
  }

  addBorrowed(id: string, analyser: AnalyserNode): void {
    const existing = this.entries.get(id);
    if (existing && existing.type === 'borrowed' && existing.analyser === analyser) {
      return;
    }

    this.remove(id);
    this.entries.set(id, { type: 'borrowed', analyser });
  }

  remove(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;

    if (entry.type === 'owned') {
      try {
        entry.source.disconnect();
        entry.analyser.disconnect();
        entry.silentGain.disconnect();
        void entry.context.close();
      } catch {
        // ignore
      }
    }

    this.entries.delete(id);
    this.smoothed.delete(id);
  }

  ids(): string[] {
    return Array.from(this.entries.keys());
  }

  sample(): Map<string, number> {
    const levels = new Map<string, number>();

    for (const [id, entry] of this.entries) {
      const raw = calculateRmsLevel(entry.analyser);
      const prev = this.smoothed.get(id) ?? 0;
      const smoothed = prev + this.smoothFactor * (raw - prev);
      this.smoothed.set(id, smoothed);
      levels.set(id, smoothed);
    }

    return levels;
  }

  clear(): void {
    for (const id of Array.from(this.entries.keys())) {
      this.remove(id);
    }
  }

  dispose(): void {
    this.clear();
    this.smoothed.clear();
  }
}
