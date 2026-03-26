import type { CaptureState } from './capture-state';

export type StateCallback = (
  state: CaptureState,
  track: MediaStreamTrack | null,
  reason?: string,
) => void;

export type TrackChangeEvent = {
  kind: 'video' | 'audio';
  track: MediaStreamTrack | null;
};

export type StreamChangeCallback = (stream: MediaStream | null) => void;
