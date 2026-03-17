/**
 * Mock media manager for testing.
 * Implements IMediaManager interface with controllable behavior.
 */

import type { IMediaManager } from '../interfaces';
import type {
  MediaStatus,
  UserMediaConstraints,
  MediaPermissionStatus,
  MediaDeviceInfo,
  MediaStatusCallback,
  TrackAvailabilityCallback,
} from '../types';

export interface MockMediaManagerConfig {
  initialStatus?: MediaStatus;
  initialVideoEnabled?: boolean;
  initialAudioEnabled?: boolean;
  hasVideoTrack?: boolean;
  hasAudioTrack?: boolean;
}

export function createMockMediaManager(
  config: MockMediaManagerConfig = {}
): IMediaManager & {
  // Test utilities
  setStatus(status: MediaStatus): void;
  setHasVideoTrack(has: boolean): void;
  setHasAudioTrack(has: boolean): void;
  simulateStreamStart(): void;
  simulateStreamStop(): void;
  getStartStreamCalls(): UserMediaConstraints[];
  getStopStreamCalls(): number;
} {
  const {
    initialStatus = 'idle',
    initialVideoEnabled = true,
    initialAudioEnabled = true,
    hasVideoTrack = false,
    hasAudioTrack = false,
  } = config;

  let status: MediaStatus = initialStatus;
  let videoEnabled = initialVideoEnabled;
  let audioEnabled = initialAudioEnabled;
  let videoTrackExists = hasVideoTrack;
  let audioTrackExists = hasAudioTrack;
  let stream: MediaStream | null = null;

  const statusCallbacks = new Set<MediaStatusCallback>();
  const videoAvailabilityCallbacks = new Set<TrackAvailabilityCallback>();
  const audioAvailabilityCallbacks = new Set<TrackAvailabilityCallback>();

  const startStreamCalls: UserMediaConstraints[] = [];
  let stopStreamCalls = 0;

  const notifyStatusChange = (newStatus: MediaStatus) => {
    statusCallbacks.forEach((cb) => cb(newStatus));
  };

  const notifyVideoAvailability = (available: boolean) => {
    videoAvailabilityCallbacks.forEach((cb) => cb(available));
  };

  const notifyAudioAvailability = (available: boolean) => {
    audioAvailabilityCallbacks.forEach((cb) => cb(available));
  };

  return {
    // IMediaAcquisition
    async startStream(constraints?: UserMediaConstraints): Promise<MediaStream> {
      startStreamCalls.push(constraints ?? {});
      status = 'active';
      stream = new MediaStream();
      notifyStatusChange('active');
      return stream;
    },

    stopStream(): void {
      stopStreamCalls++;
      status = 'idle';
      stream = null;
      videoTrackExists = false;
      audioTrackExists = false;
      notifyStatusChange('idle');
      notifyVideoAvailability(false);
      notifyAudioAvailability(false);
    },

    getStream(): MediaStream | null {
      return stream;
    },

    // IMediaTrackController
    async startVideoTrack(): Promise<MediaStreamTrack | null> {
      videoTrackExists = true;
      videoEnabled = true;
      notifyVideoAvailability(true);
      return { kind: 'video' } as MediaStreamTrack;
    },

    stopVideoTrack(): void {
      videoTrackExists = false;
      videoEnabled = false;
      notifyVideoAvailability(false);
    },

    async startAudioTrack(): Promise<MediaStreamTrack | null> {
      audioTrackExists = true;
      audioEnabled = true;
      notifyAudioAvailability(true);
      return { kind: 'audio' } as MediaStreamTrack;
    },

    stopAudioTrack(): void {
      audioTrackExists = false;
      audioEnabled = false;
      notifyAudioAvailability(false);
    },

    hasVideoTrack(): boolean {
      return videoTrackExists;
    },

    hasAudioTrack(): boolean {
      return audioTrackExists;
    },

    isVideoEnabled(): boolean {
      return videoEnabled;
    },

    isAudioEnabled(): boolean {
      return audioEnabled;
    },

    isPreferredVideoEnabled(): boolean {
      return videoEnabled;
    },

    isPreferredAudioEnabled(): boolean {
      return audioEnabled;
    },

    setPreferredVideoEnabled(enabled: boolean): void {
      videoEnabled = enabled;
    },

    setPreferredAudioEnabled(enabled: boolean): void {
      audioEnabled = enabled;
    },

    async toggleVideo(enabled: boolean): Promise<boolean> {
      videoEnabled = enabled;
      notifyVideoAvailability(enabled);
      return true;
    },

    async toggleAudio(enabled: boolean): Promise<boolean> {
      audioEnabled = enabled;
      notifyAudioAvailability(enabled);
      return true;
    },

    // IMediaDeviceSelector
    async enumerateDevices(): Promise<MediaDeviceInfo[]> {
      return [
        { deviceId: 'video-1', kind: 'videoinput', label: 'Camera 1' },
        { deviceId: 'audio-1', kind: 'audioinput', label: 'Microphone 1' },
      ];
    },

    async switchVideoDevice(): Promise<MediaStreamTrack | null> {
      return { kind: 'video' } as MediaStreamTrack;
    },

    async switchAudioDevice(): Promise<MediaStreamTrack | null> {
      return { kind: 'audio' } as MediaStreamTrack;
    },

    getVideoDeviceId(): string | null {
      return videoTrackExists ? 'video-1' : null;
    },

    getAudioDeviceId(): string | null {
      return audioTrackExists ? 'audio-1' : null;
    },

    setSelectedVideoDeviceId(): void {
      // No-op in mock
    },

    setSelectedAudioDeviceId(): void {
      // No-op in mock
    },

    // IMediaPermissionChecker
    async checkPermissions(): Promise<MediaPermissionStatus> {
      return {
        hasVideo: true,
        hasAudio: true,
        videoPermission: 'granted',
        audioPermission: 'granted',
      };
    },

    // IMediaStateNotifier
    getStatus(): MediaStatus {
      return status;
    },

    onStatusChange(callback: MediaStatusCallback): () => void {
      statusCallbacks.add(callback);
      return () => statusCallbacks.delete(callback);
    },

    onVideoAvailabilityChange(callback: TrackAvailabilityCallback): () => void {
      videoAvailabilityCallbacks.add(callback);
      return () => videoAvailabilityCallbacks.delete(callback);
    },

    onAudioAvailabilityChange(callback: TrackAvailabilityCallback): () => void {
      audioAvailabilityCallbacks.add(callback);
      return () => audioAvailabilityCallbacks.delete(callback);
    },

    // Test utilities
    setStatus(newStatus: MediaStatus): void {
      status = newStatus;
      notifyStatusChange(newStatus);
    },

    setHasVideoTrack(has: boolean): void {
      videoTrackExists = has;
      notifyVideoAvailability(has);
    },

    setHasAudioTrack(has: boolean): void {
      audioTrackExists = has;
      notifyAudioAvailability(has);
    },

    simulateStreamStart(): void {
      status = 'active';
      stream = new MediaStream();
      videoTrackExists = true;
      audioTrackExists = true;
      notifyStatusChange('active');
      notifyVideoAvailability(true);
      notifyAudioAvailability(true);
    },

    simulateStreamStop(): void {
      status = 'idle';
      stream = null;
      videoTrackExists = false;
      audioTrackExists = false;
      notifyStatusChange('idle');
      notifyVideoAvailability(false);
      notifyAudioAvailability(false);
    },

    getStartStreamCalls(): UserMediaConstraints[] {
      return [...startStreamCalls];
    },

    getStopStreamCalls(): number {
      return stopStreamCalls;
    },
  };
}
