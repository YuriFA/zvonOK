/**
 * Media permissions checker.
 * Handles permission state queries for camera and microphone.
 */

import type { MediaPermissionStatus } from './types';

/**
 * Check available media devices and their permission states.
 */
export async function checkPermissions(): Promise<MediaPermissionStatus> {
  let hasVideo = false;
  let hasAudio = false;
  let videoPermission: PermissionState | 'unknown' = 'unknown';
  let audioPermission: PermissionState | 'unknown' = 'unknown';

  // Try to use the Permissions API (not supported in all browsers)
  if (navigator.permissions) {
    try {
      const videoStatus = await navigator.permissions.query({
        name: 'camera' as PermissionName,
      });
      videoPermission = videoStatus.state;
    } catch {
      // Permissions API not supported for camera
    }

    try {
      const audioStatus = await navigator.permissions.query({
        name: 'microphone' as PermissionName,
      });
      audioPermission = audioStatus.state;
    } catch {
      // Permissions API not supported for microphone
    }
  }

  // Check for available devices
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    hasVideo = devices.some((d) => d.kind === 'videoinput');
    hasAudio = devices.some((d) => d.kind === 'audioinput');
  } catch {
    // enumerateDevices failed
  }

  return {
    hasVideo,
    hasAudio,
    videoPermission,
    audioPermission,
  };
}
