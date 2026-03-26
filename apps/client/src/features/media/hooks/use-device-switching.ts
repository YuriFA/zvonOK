import { useCallback, useRef } from 'react';
import { useVideoCaptureControl, useAudioCaptureControl, useVideoCaptureState, useAudioCaptureState } from '@/features/media/contexts/media-manager.context';
import { isActive } from '@/lib/media/capture-state';

export interface UseDeviceSwitchingReturn {
  switchVideoDevice: (deviceId: string) => Promise<boolean>;
  switchAudioDevice: (deviceId: string) => Promise<boolean>;
  switchSpeakerDevice: (element: HTMLMediaElement | null, deviceId: string) => Promise<boolean>;
  isSpeakerSwitchSupported: boolean;
}

export function useDeviceSwitching(): UseDeviceSwitchingReturn {
  const videoController = useVideoCaptureControl();
  const audioController = useAudioCaptureControl();
  const videoStateReader = useVideoCaptureState();
  const audioStateReader = useAudioCaptureState();
  const isSwitchingRef = useRef(false);

  const switchVideoDevice = useCallback(async (deviceId: string): Promise<boolean> => {
    if (isSwitchingRef.current) {
      console.log('[DeviceSwitching] Already switching, skipping');
      return false;
    }

    isSwitchingRef.current = true;

    try {
      if (!isActive(videoStateReader.getState())) {
        return true;
      }

      return await videoController.switchDevice(deviceId);
    } catch (error) {
      console.error('[DeviceSwitching] Failed to switch video device:', error);
      return false;
    } finally {
      isSwitchingRef.current = false;
    }
  }, [videoController, videoStateReader]);

  const switchAudioDevice = useCallback(async (deviceId: string): Promise<boolean> => {
    if (isSwitchingRef.current) {
      console.log('[DeviceSwitching] Already switching, skipping');
      return false;
    }

    isSwitchingRef.current = true;

    try {
      if (!isActive(audioStateReader.getState())) {
        return true;
      }

      return await audioController.switchDevice(deviceId);
    } catch (error) {
      console.error('[DeviceSwitching] Failed to switch audio device:', error);
      return false;
    } finally {
      isSwitchingRef.current = false;
    }
  }, [audioController, audioStateReader]);

  const switchSpeakerDevice = useCallback(
    async (element: HTMLMediaElement | null, deviceId: string): Promise<boolean> => {
      if (!element) {
        console.error('[DeviceSwitching] No media element provided for speaker switching');
        return false;
      }

      if (!('setSinkId' in HTMLMediaElement.prototype)) {
        console.warn('[DeviceSwitching] setSinkId not supported in this browser');
        return false;
      }

      try {
        await (element as HTMLMediaElement & { setSinkId: (id: string) => Promise<void> }).setSinkId(deviceId);
        return true;
      } catch (error) {
        console.error('[DeviceSwitching] Failed to switch speaker device:', error);
        return false;
      }
    },
    [],
  );

  const isSpeakerSwitchSupported = 'setSinkId' in HTMLMediaElement.prototype;

  return {
    switchVideoDevice,
    switchAudioDevice,
    switchSpeakerDevice,
    isSpeakerSwitchSupported,
  };
}
