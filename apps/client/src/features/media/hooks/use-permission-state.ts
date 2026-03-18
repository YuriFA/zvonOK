/**
 * Reactive permission state hook.
 * Uses the Permissions API with `onchange` listeners to track camera and
 * microphone permission state without polling.
 */

import { useCallback, useEffect, useState } from 'react';

type DevicePermission = 'granted' | 'denied' | 'prompt';

export interface PermissionStateResult {
  cameraPermission: DevicePermission;
  microphonePermission: DevicePermission;
  isCameraDenied: boolean;
  isMicrophoneDenied: boolean;
  isAnyDenied: boolean;
  /** Re-request access; resolves to true on grant, false on deny. */
  requestPermission: (kind: 'camera' | 'microphone' | 'both') => Promise<boolean>;
}

async function queryPermission(name: 'camera' | 'microphone'): Promise<PermissionStatus | null> {
  if (!navigator.permissions) return null;
  try {
    return await navigator.permissions.query({ name: name as PermissionName });
  } catch {
    return null;
  }
}

function toDevicePermission(state: PermissionState | null): DevicePermission {
  if (state === 'granted') return 'granted';
  if (state === 'denied') return 'denied';
  return 'prompt';
}

export function usePermissionState(): PermissionStateResult {
  const [cameraPermission, setCameraPermission] = useState<DevicePermission>('prompt');
  const [microphonePermission, setMicrophonePermission] = useState<DevicePermission>('prompt');

  useEffect(() => {
    let cameraStatus: PermissionStatus | null = null;
    let micStatus: PermissionStatus | null = null;
    let cancelled = false;

    const handleCameraChange = () => {
      if (cameraStatus && !cancelled) {
        setCameraPermission(toDevicePermission(cameraStatus.state));
      }
    };

    const handleMicChange = () => {
      if (micStatus && !cancelled) {
        setMicrophonePermission(toDevicePermission(micStatus.state));
      }
    };

    async function init() {
      cameraStatus = await queryPermission('camera');
      micStatus = await queryPermission('microphone');

      if (cancelled) return;

      if (cameraStatus) {
        setCameraPermission(toDevicePermission(cameraStatus.state));
        cameraStatus.addEventListener('change', handleCameraChange);
      }

      if (micStatus) {
        setMicrophonePermission(toDevicePermission(micStatus.state));
        micStatus.addEventListener('change', handleMicChange);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (cameraStatus) {
        cameraStatus.removeEventListener('change', handleCameraChange);
      }
      if (micStatus) {
        micStatus.removeEventListener('change', handleMicChange);
      }
    };
  }, []);

  const requestPermission = useCallback(
    async (kind: 'camera' | 'microphone' | 'both'): Promise<boolean> => {
      const constraints: MediaStreamConstraints = {
        video: kind === 'microphone' ? false : true,
        audio: kind === 'camera' ? false : true,
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        // Stop the temporary stream — tracks will be re-acquired by the manager
        for (const track of stream.getTracks()) {
          track.stop();
        }
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const isCameraDenied = cameraPermission === 'denied';
  const isMicrophoneDenied = microphonePermission === 'denied';
  const isAnyDenied = isCameraDenied || isMicrophoneDenied;

  return {
    cameraPermission,
    microphonePermission,
    isCameraDenied,
    isMicrophoneDenied,
    isAnyDenied,
    requestPermission,
  };
}
