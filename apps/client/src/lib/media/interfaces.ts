/**
 * Media module interfaces.
 * These interfaces define the contracts for media management components,
 * following SOLID principles with single-responsibility interfaces.
 */

import type {
  UserMediaConstraints,
  MediaPermissionStatus,
  MediaStatus,
  TrackAvailabilityCallback,
  MediaStatusCallback,
  MediaDeviceInfo,
} from './types';

/**
 * Responsible for acquiring and releasing media streams.
 * Single responsibility: getUserMedia orchestration.
 */
export interface IMediaAcquisition {
  /** Start the media stream with optional constraints */
  startStream(constraints?: UserMediaConstraints): Promise<MediaStream>;
  /** Stop the media stream and all tracks */
  stopStream(): void;
  /** Get the current media stream */
  getStream(): MediaStream | null;
}

/**
 * Responsible for individual track lifecycle.
 * Single responsibility: track start/stop/replace operations.
 */
export interface IMediaTrackController {
  /** Start video track, returns the track or null on failure */
  startVideoTrack(): Promise<MediaStreamTrack | null>;
  /** Stop video track with optional reason */
  stopVideoTrack(reason?: string): void;
  /** Start audio track, returns the track or null on failure */
  startAudioTrack(): Promise<MediaStreamTrack | null>;
  /** Stop audio track with optional reason */
  stopAudioTrack(reason?: string): void;
  /** Check if video track exists */
  hasVideoTrack(): boolean;
  /** Check if audio track exists */
  hasAudioTrack(): boolean;
  /** Check if video track is enabled */
  isVideoEnabled(): boolean;
  /** Check if audio track is enabled */
  isAudioEnabled(): boolean;
  /** Get preferred video enabled state */
  isPreferredVideoEnabled(): boolean;
  /** Get preferred audio enabled state */
  isPreferredAudioEnabled(): boolean;
  /** Set preferred video enabled state */
  setPreferredVideoEnabled(enabled: boolean): void;
  /** Set preferred audio enabled state */
  setPreferredAudioEnabled(enabled: boolean): void;
}

/**
 * Responsible for device selection and switching.
 * Single responsibility: device enumeration and selection.
 */
export interface IMediaDeviceSelector {
  /** Enumerate available media devices */
  enumerateDevices(): Promise<MediaDeviceInfo[]>;
  /** Switch to a specific video device */
  switchVideoDevice(deviceId: string): Promise<MediaStreamTrack | null>;
  /** Switch to a specific audio device */
  switchAudioDevice(deviceId: string): Promise<MediaStreamTrack | null>;
  /** Get current video device ID */
  getVideoDeviceId(): string | null;
  /** Get current audio device ID */
  getAudioDeviceId(): string | null;
  /** Set selected video device ID */
  setSelectedVideoDeviceId(deviceId: string | null): void;
  /** Set selected audio device ID */
  setSelectedAudioDeviceId(deviceId: string | null): void;
}

/**
 * Responsible for permission checking.
 * Single responsibility: permission queries.
 */
export interface IMediaPermissionChecker {
  /** Check permission status for camera and microphone */
  checkPermissions(): Promise<MediaPermissionStatus>;
}

/**
 * Observable media state.
 * Single responsibility: state broadcasting.
 */
export interface IMediaStateNotifier {
  /** Get current media status */
  getStatus(): MediaStatus;
  /** Subscribe to status changes */
  onStatusChange(callback: MediaStatusCallback): () => void;
  /** Subscribe to video availability changes */
  onVideoAvailabilityChange(callback: TrackAvailabilityCallback): () => void;
  /** Subscribe to audio availability changes */
  onAudioAvailabilityChange(callback: TrackAvailabilityCallback): () => void;
}

/**
 * Internal state store abstraction.
 * Used by acquisition and track controller modules to decouple from the
 * concrete MediaStateStore implementation (DIP).
 */
export interface IMediaStateStore extends IMediaStateNotifier {
  /** Update the current media status and notify subscribers */
  setStatus(status: MediaStatus): void;
  /** Notify subscribers about video track availability changes */
  notifyVideoAvailability(available: boolean, reason?: string): void;
  /** Notify subscribers about audio track availability changes */
  notifyAudioAvailability(available: boolean, reason?: string): void;
}

/**
 * Facade combining all media concerns.
 * Use this as the default injection token for components that need
 * full media management capabilities.
 *
 * toggleVideo/toggleAudio live here rather than on IMediaTrackController
 * because they orchestrate track start/stop — a facade responsibility.
 */
export interface IMediaManager
  extends IMediaAcquisition,
  IMediaTrackController,
  IMediaDeviceSelector,
  IMediaPermissionChecker,
  IMediaStateNotifier {
  /** Toggle video on/off, returns true if the operation succeeded */
  toggleVideo(enabled: boolean): Promise<boolean>;
  /** Toggle audio on/off, returns true if the operation succeeded */
  toggleAudio(enabled: boolean): Promise<boolean>;
}
