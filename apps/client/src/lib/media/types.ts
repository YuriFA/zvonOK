/**
 * Media module types.
 * These types define the data structures used throughout the media management layer.
 */

/** Current status of the media stream */
export type MediaStatus = 'idle' | 'starting' | 'active' | 'stopped' | 'error';

/** Callback type for media status changes */
export type MediaStatusCallback = (status: MediaStatus) => void;

/** Callback type for track availability notifications */
export type TrackAvailabilityCallback = (available: boolean, reason?: string) => void;

/**
 * Media constraints for getUserMedia.
 * Renamed to avoid shadowing the browser's MediaStreamConstraints.
 */
export interface UserMediaConstraints {
  video?: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
}

/** Permission status for media devices */
export interface MediaPermissionStatus {
  hasVideo: boolean;
  hasAudio: boolean;
  videoPermission: PermissionState | 'unknown';
  audioPermission: PermissionState | 'unknown';
}

/** Simplified device info for UI consumption */
export interface MediaDeviceInfo {
  deviceId: string;
  kind: 'videoinput' | 'audioinput';
  label: string;
}

/** Default video constraints */
export const DEFAULT_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: 'user',
};

/** Default audio constraints */
export const DEFAULT_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

/** Default combined constraints */
export const DEFAULT_CONSTRAINTS: UserMediaConstraints = {
  video: DEFAULT_VIDEO_CONSTRAINTS,
  audio: DEFAULT_AUDIO_CONSTRAINTS,
};
