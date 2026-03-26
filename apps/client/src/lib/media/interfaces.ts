import type { CaptureState } from './capture-state';
import type { StateCallback, TrackChangeEvent, StreamChangeCallback } from './types';

export interface IMediaCapture {
  getState(): CaptureState;
  getTrack(): MediaStreamTrack | null;
  onStateChange(cb: StateCallback): () => void;
  start(deviceId?: string): Promise<boolean>;
  stop(): void;
  switchDevice(deviceId: string): Promise<boolean>;
  toggle(enabled: boolean): Promise<boolean>;
}

export interface IMediaDeviceService {
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
  enumerateDevices(): Promise<MediaDeviceInfo[]>;
  queryPermission(kind: 'video' | 'audio'): Promise<PermissionStatus>;
}

export interface IErrorClassifier {
  classify(error: unknown, kind: 'video' | 'audio'): {
    state: CaptureState;
    recoverable: boolean;
    reason: string;
  };
}

export interface ICaptureStateReader {
  getState(): CaptureState;
  onStateChange(cb: StateCallback): () => void;
}

export interface ICaptureController {
  toggle(enabled: boolean): Promise<boolean>;
  switchDevice(deviceId: string): Promise<boolean>;
  stop(): void;
}

export interface ICaptureTrackProvider {
  getTrack(): MediaStreamTrack | null;
  onStateChange(cb: StateCallback): () => void;
}

export interface IMediaManager {
  readonly videoCapture: IMediaCapture;
  readonly audioCapture: IMediaCapture;
  getCombinedStream(): MediaStream | null;
  onCombinedStreamChange(cb: StreamChangeCallback): () => void;
  onTrackChange(cb: (event: TrackChangeEvent) => void): () => void;
  getDeviceService(): IMediaDeviceService;
  start(options?: { video?: boolean; audio?: boolean; videoDeviceId?: string; audioDeviceId?: string }): Promise<void>;
  stop(): void;
  onVideoStateChange(cb: StateCallback): () => void;
  onAudioStateChange(cb: StateCallback): () => void;
}
