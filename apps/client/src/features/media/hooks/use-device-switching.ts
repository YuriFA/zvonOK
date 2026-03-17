import { useCallback, useRef } from 'react';
import { useMediaDeviceSelector, useMediaTrackController } from '@/features/media/contexts/media-manager.context';
import { useSfuManager } from '@/features/sfu/contexts/sfu-manager.context';

export interface UseDeviceSwitchingReturn {
  switchVideoDevice: (deviceId: string) => Promise<boolean>;
  switchAudioDevice: (deviceId: string) => Promise<boolean>;
  switchSpeakerDevice: (element: HTMLMediaElement | null, deviceId: string) => Promise<boolean>;
  isSpeakerSwitchSupported: boolean;
}

export function useDeviceSwitching(): UseDeviceSwitchingReturn {
  const deviceSelector = useMediaDeviceSelector();
  const trackController = useMediaTrackController();
  const sfuManager = useSfuManager();
  const isSwitchingRef = useRef(false);

  const switchVideoDevice = useCallback(async (deviceId: string): Promise<boolean> => {
    if (isSwitchingRef.current) {
      console.log('[DeviceSwitching] Already switching, skipping');
      return false;
    }

    isSwitchingRef.current = true;

    try {
      if (!trackController.hasVideoTrack()) {
        deviceSelector.setSelectedVideoDeviceId(deviceId);
        return true;
      }

      const newTrack = await deviceSelector.switchVideoDevice(deviceId);

      if (!newTrack) {
        console.error('[DeviceSwitching] Failed to get new video track');
        return false;
      }

      const sfuSuccess = await sfuManager.replaceTrack('video', newTrack);

      if (!sfuSuccess) {
        console.warn('[DeviceSwitching] Some peer connections failed to update video track');
      }

      return sfuSuccess;
    } catch (error) {
      console.error('[DeviceSwitching] Failed to switch video device:', error);
      return false;
    } finally {
      isSwitchingRef.current = false;
    }
  }, [deviceSelector, trackController, sfuManager]);

  const switchAudioDevice = useCallback(async (deviceId: string): Promise<boolean> => {
    if (isSwitchingRef.current) {
      console.log('[DeviceSwitching] Already switching, skipping');
      return false;
    }

    isSwitchingRef.current = true;

    try {
      if (!trackController.hasAudioTrack()) {
        deviceSelector.setSelectedAudioDeviceId(deviceId);
        return true;
      }

      const newTrack = await deviceSelector.switchAudioDevice(deviceId);

      if (!newTrack) {
        console.error('[DeviceSwitching] Failed to get new audio track');
        return false;
      }

      // Replace track in all WebRTC peer connections
      const sfuSuccess = await sfuManager.replaceTrack('audio', newTrack);

      if (!sfuSuccess) {
        console.warn('[DeviceSwitching] Some peer connections failed to update audio track');
      }

      return sfuSuccess;
    } catch (error) {
      console.error('[DeviceSwitching] Failed to switch audio device:', error);
      return false;
    } finally {
      isSwitchingRef.current = false;
    }
  }, [deviceSelector, trackController, sfuManager]);

  const switchSpeakerDevice = useCallback(
    async (element: HTMLMediaElement | null, deviceId: string): Promise<boolean> => {
      if (!element) {
        console.error('[DeviceSwitching] No media element provided for speaker switching');
        return false;
      }

      // Check if setSinkId is supported
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
    []
  );

  // Check if speaker switching is supported
  const isSpeakerSwitchSupported = 'setSinkId' in HTMLMediaElement.prototype;

  return {
    switchVideoDevice,
    switchAudioDevice,
    switchSpeakerDevice,
    isSpeakerSwitchSupported,
  };
}

