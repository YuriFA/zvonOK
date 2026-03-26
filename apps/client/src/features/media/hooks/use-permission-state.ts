import { useCallback, useEffect, useState } from 'react';
import { useDeviceService } from '@/features/media/contexts/media-manager.context';
import { CaptureState } from '@/lib/media/capture-state';
import { useVideoCaptureState, useAudioCaptureState } from '@/features/media/contexts/media-manager.context';

type DevicePermission = 'granted' | 'denied' | 'prompt';

export interface PermissionStateResult {
  cameraPermission: DevicePermission;
  microphonePermission: DevicePermission;
  isCameraDenied: boolean;
  isMicrophoneDenied: boolean;
  isAnyDenied: boolean;
  requestPermission: (kind: 'camera' | 'microphone' | 'both') => Promise<boolean>;
}

function toDevicePermission(state: PermissionState | null): DevicePermission {
  if (state === 'granted') return 'granted';
  if (state === 'denied') return 'denied';
  return 'prompt';
}

export function usePermissionState(): PermissionStateResult {
  const deviceService = useDeviceService();
  const videoCapture = useVideoCaptureState();
  const audioCapture = useAudioCaptureState();

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
      try {
        cameraStatus = await deviceService.queryPermission('video');
      } catch {
        cameraStatus = null;
      }
      try {
        micStatus = await deviceService.queryPermission('audio');
      } catch {
        micStatus = null;
      }

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
  }, [deviceService]);

  useEffect(() => {
    const updateFromCaptureState = (videoState: CaptureState, audioState: CaptureState) => {
      if (videoState === CaptureState.DEVICE_NOT_FOUND || videoState === CaptureState.SYSTEM_DENIED) {
        setCameraPermission('denied');
      } else if (videoState === CaptureState.ACTIVE) {
        setCameraPermission('granted');
      }

      if (audioState === CaptureState.DEVICE_NOT_FOUND || audioState === CaptureState.SYSTEM_DENIED) {
        setMicrophonePermission('denied');
      } else if (audioState === CaptureState.ACTIVE) {
        setMicrophonePermission('granted');
      }
    };

    updateFromCaptureState(videoCapture.getState(), audioCapture.getState());

    const unsubVideo = videoCapture.onStateChange((state) => {
      updateFromCaptureState(state, audioCapture.getState());
    });
    const unsubAudio = audioCapture.onStateChange((state) => {
      updateFromCaptureState(videoCapture.getState(), state);
    });

    return () => {
      unsubVideo();
      unsubAudio();
    };
  }, [videoCapture, audioCapture]);

  const requestPermission = useCallback(
    async (kind: 'camera' | 'microphone' | 'both'): Promise<boolean> => {
      const constraints: MediaStreamConstraints = {
        video: kind === 'microphone' ? false : true,
        audio: kind === 'camera' ? false : true,
      };

      try {
        const stream = await deviceService.getUserMedia(constraints);
        for (const track of stream.getTracks()) {
          track.stop();
        }
        return true;
      } catch {
        return false;
      }
    },
    [deviceService],
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
