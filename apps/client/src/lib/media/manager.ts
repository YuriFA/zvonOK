import type { IMediaDeviceService } from './device-service';
import type { IErrorClassifier } from './error-classifier';
import type { IMediaManager, IMediaCapture } from './interfaces';
import type { StateCallback, TrackChangeEvent, StreamChangeCallback } from './types';
import { CaptureState } from './capture-state';
import { MediaCapture } from './capture';

export class MediaStreamManager implements IMediaManager {
  readonly videoCapture: IMediaCapture;
  readonly audioCapture: IMediaCapture;
  private combinedStream: MediaStream | null = null;
  private deviceService: IMediaDeviceService;
  private trackChangeCallbacks = new Set<(event: TrackChangeEvent) => void>();
  private combinedStreamCallbacks = new Set<StreamChangeCallback>();

  constructor(deps: { deviceService: IMediaDeviceService; errorClassifier: IErrorClassifier }) {
    this.deviceService = deps.deviceService;
    this.videoCapture = new MediaCapture(deps.deviceService, 'video', deps.errorClassifier);
    this.audioCapture = new MediaCapture(deps.deviceService, 'audio', deps.errorClassifier);

    this.videoCapture.onStateChange((state, track) => {
      if (state === CaptureState.ACTIVE && track) {
        this.addTrackToCombined(track);
      } else if (state !== CaptureState.ACTIVE) {
        this.removeKindFromCombined('video');
      }
      this.emitTrackChange('video', state === CaptureState.ACTIVE ? track : null);
    });

    this.audioCapture.onStateChange((state, track) => {
      if (state === CaptureState.ACTIVE && track) {
        this.addTrackToCombined(track);
      } else if (state !== CaptureState.ACTIVE) {
        this.removeKindFromCombined('audio');
      }
      this.emitTrackChange('audio', state === CaptureState.ACTIVE ? track : null);
    });
  }

  getCombinedStream(): MediaStream | null {
    return this.combinedStream;
  }

  onCombinedStreamChange(cb: StreamChangeCallback): () => void {
    this.combinedStreamCallbacks.add(cb);
    cb(this.combinedStream);
    return () => { this.combinedStreamCallbacks.delete(cb); };
  }

  onTrackChange(cb: (event: TrackChangeEvent) => void): () => void {
    this.trackChangeCallbacks.add(cb);
    return () => { this.trackChangeCallbacks.delete(cb); };
  }

  getDeviceService(): IMediaDeviceService {
    return this.deviceService;
  }

  async start(options?: { video?: boolean; audio?: boolean; videoDeviceId?: string; audioDeviceId?: string }): Promise<void> {
    const startVideo = options?.video ?? true;
    const startAudio = options?.audio ?? true;

    if (!this.combinedStream) {
      this.combinedStream = new MediaStream();
      this.emitCombinedStreamChange();
    }

    const promises: Promise<void>[] = [];

    if (startVideo) {
      promises.push(
        this.videoCapture.start(options?.videoDeviceId).then(() => { }).catch((e) => console.warn('[MediaManager] Video capture start failed:', e)),
      );
    }
    if (startAudio) {
      promises.push(
        this.audioCapture.start(options?.audioDeviceId).then(() => { }).catch((e) => console.warn('[MediaManager] Audio capture start failed:', e)),
      );
    }

    await Promise.all(promises);
  }

  stop(): void {
    this.videoCapture.stop();
    this.audioCapture.stop();
    if (this.combinedStream) {
      this.combinedStream.getTracks().forEach(t => t.stop());
      this.combinedStream = null;
      this.emitCombinedStreamChange();
    }
  }

  onVideoStateChange(cb: StateCallback): () => void {
    return this.videoCapture.onStateChange(cb);
  }

  onAudioStateChange(cb: StateCallback): () => void {
    return this.audioCapture.onStateChange(cb);
  }

  private addTrackToCombined(track: MediaStreamTrack): void {
    if (!this.combinedStream) {
      this.combinedStream = new MediaStream();
    }

    const kind = track.kind === 'video' ? 'video' : 'audio';
    this.combinedStream.getTracks()
      .filter(t => t.kind === kind)
      .forEach(t => this.combinedStream!.removeTrack(t));

    this.combinedStream.addTrack(track);
    this.emitCombinedStreamChange();
  }

  private removeKindFromCombined(kind: 'video' | 'audio'): void {
    if (!this.combinedStream) return;

    const trackKind = kind === 'video' ? 'video' : 'audio';
    this.combinedStream.getTracks()
      .filter(t => t.kind === trackKind)
      .forEach(t => this.combinedStream!.removeTrack(t));

    this.emitCombinedStreamChange();
  }

  private emitTrackChange(kind: 'video' | 'audio', track: MediaStreamTrack | null): void {
    const event: TrackChangeEvent = { kind, track };
    this.trackChangeCallbacks.forEach(cb => cb(event));
  }

  private emitCombinedStreamChange(): void {
    this.combinedStreamCallbacks.forEach(cb => cb(this.combinedStream));
  }
}
