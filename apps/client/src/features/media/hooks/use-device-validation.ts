/**
 * Device validation hook.
 * Validates that previously selected devices are still available before
 * joining a call, surfacing recoverable errors instead of silently
 * falling back to browser defaults.
 */

import { useCallback, useState } from 'react';
import { useMediaDeviceSelector, useMediaTrackController } from '../contexts/media-manager.context';

export interface DeviceValidationError {
  kind: 'video' | 'audio';
  deviceId: string;
  message: string;
}

export interface UseDeviceValidationReturn {
  /** Errors from the most recent validation run. Empty when all devices are available. */
  errors: DeviceValidationError[];
  /** Validate that selected devices are still connected. Resolves to true when all OK. */
  validate: () => Promise<boolean>;
  /** Dismiss a specific error (user acknowledges the fallback). */
  dismissError: (kind: 'video' | 'audio') => void;
  /** Dismiss all errors. */
  dismissAll: () => void;
}

export function useDeviceValidation(): UseDeviceValidationReturn {
  const deviceSelector = useMediaDeviceSelector();
  const trackController = useMediaTrackController();
  const [errors, setErrors] = useState<DeviceValidationError[]>([]);

  const validate = useCallback(async (): Promise<boolean> => {
    const videoDeviceId = deviceSelector.getVideoDeviceId();
    const audioDeviceId = deviceSelector.getAudioDeviceId();

    // Nothing explicitly selected — browser defaults are fine
    if (!videoDeviceId && !audioDeviceId) {
      setErrors([]);
      return true;
    }

    let availableDevices: MediaDeviceInfo[];
    try {
      availableDevices = await navigator.mediaDevices.enumerateDevices();
    } catch {
      // Cannot enumerate — skip validation
      setErrors([]);
      return true;
    }

    const newErrors: DeviceValidationError[] = [];

    // NOTE: We only validate devices whose media kind is currently enabled.
    // If a user disables video in the pre-join state and the saved camera is later
    // disconnected, re-enabling video in-call will hit the track controller's
    // own fallback path (OverconstrainedError → default device). This is
    // acceptable because warning about a disabled device would be confusing.
    if (videoDeviceId && trackController.isPreferredVideoEnabled()) {
      const videoExists = availableDevices.some(
        (d) => d.kind === 'videoinput' && d.deviceId === videoDeviceId
      );
      if (!videoExists) {
        newErrors.push({
          kind: 'video',
          deviceId: videoDeviceId,
          message: 'Selected camera is no longer available',
        });
      }
    }

    if (audioDeviceId && trackController.isPreferredAudioEnabled()) {
      const audioExists = availableDevices.some(
        (d) => d.kind === 'audioinput' && d.deviceId === audioDeviceId
      );
      if (!audioExists) {
        newErrors.push({
          kind: 'audio',
          deviceId: audioDeviceId,
          message: 'Selected microphone is no longer available',
        });
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  }, [deviceSelector, trackController]);

  const dismissError = useCallback((kind: 'video' | 'audio') => {
    setErrors((prev) => prev.filter((e) => e.kind !== kind));
  }, []);

  const dismissAll = useCallback(() => {
    setErrors([]);
  }, []);

  return { errors, validate, dismissError, dismissAll };
}
