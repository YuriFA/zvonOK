import { useCallback, useRef, useEffect } from 'react';
import { mediaManager } from '@/lib/media/manager';
import { sfuManager } from '@/lib/sfu/manager';
import { webrtcManager } from '@/lib/webrtc/manager';

export interface UseDeviceSwitchingReturn {
  switchVideoDevice: (deviceId: string) => Promise<boolean>;
  switchAudioDevice: (deviceId: string) => Promise<boolean>;
  switchSpeakerDevice: (element: HTMLMediaElement | null, deviceId: string) => Promise<boolean>;
  isSpeakerSwitchSupported: boolean;
}

/**
 * Hook for switching media devices (camera, microphone, speaker).
 * Integrates with MediaStreamManager and WebRTCManager for seamless switching.
 */
export function useDeviceSwitching(): UseDeviceSwitchingReturn {
  const isSwitchingRef = useRef(false);

  /**
   * Switch video input device (camera).
   * Updates the local stream and replaces track in all peer connections.
   */
  const switchVideoDevice = useCallback(async (deviceId: string): Promise<boolean> => {
    if (isSwitchingRef.current) {
      console.log('[DeviceSwitching] Already switching, skipping');
      return false;
    }

    isSwitchingRef.current = true;

    try {
      const newTrack = await mediaManager.switchVideoDevice(deviceId);

      if (!newTrack) {
        console.error('[DeviceSwitching] Failed to get new video track');
        return false;
      }

      // Replace track in all WebRTC peer connections
      const [webrtcSuccess, sfuSuccess] = await Promise.all([
        webrtcManager.replaceTrack('video', newTrack),
        sfuManager.replaceTrack('video', newTrack),
      ]);

      const success = webrtcSuccess && sfuSuccess;

      if (!success) {
        console.warn('[DeviceSwitching] Some peer connections failed to update video track');
      }

      return success;
    } catch (error) {
      console.error('[DeviceSwitching] Failed to switch video device:', error);
      return false;
    } finally {
      isSwitchingRef.current = false;
    }
  }, []);

  /**
   * Switch audio input device (microphone).
   * Updates the local stream and replaces track in all peer connections.
   */
  const switchAudioDevice = useCallback(async (deviceId: string): Promise<boolean> => {
    if (isSwitchingRef.current) {
      console.log('[DeviceSwitching] Already switching, skipping');
      return false;
    }

    isSwitchingRef.current = true;

    try {
      const newTrack = await mediaManager.switchAudioDevice(deviceId);

      if (!newTrack) {
        console.error('[DeviceSwitching] Failed to get new audio track');
        return false;
      }

      // Replace track in all WebRTC peer connections
      const [webrtcSuccess, sfuSuccess] = await Promise.all([
        webrtcManager.replaceTrack('audio', newTrack),
        sfuManager.replaceTrack('audio', newTrack),
      ]);

      const success = webrtcSuccess && sfuSuccess;

      if (!success) {
        console.warn('[DeviceSwitching] Some peer connections failed to update audio track');
      }

      return success;
    } catch (error) {
      console.error('[DeviceSwitching] Failed to switch audio device:', error);
      return false;
    } finally {
      isSwitchingRef.current = false;
    }
  }, []);

  /**
   * Switch audio output device (speaker).
   * Uses setSinkId API (Chrome only).
   */
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

/**
 * Hook for handling device lost events.
 * When a device is disconnected, this hook can trigger a callback.
 */
export function useDeviceLostHandler(onDeviceLost?: (kind: 'video' | 'audio') => void): void {
  useEffect(() => {
    if (!onDeviceLost) return;

    const handleDeviceChange = async () => {
      // Check if current devices are still available
      const devices = await navigator.mediaDevices.enumerateDevices();

      const currentVideoDeviceId = mediaManager.getVideoDeviceId();
      const currentAudioDeviceId = mediaManager.getAudioDeviceId();

      // Check if video device was lost
      if (currentVideoDeviceId) {
        const videoDeviceExists = devices.some(
          (d) => d.kind === 'videoinput' && d.deviceId === currentVideoDeviceId
        );
        if (!videoDeviceExists) {
          console.log('[DeviceSwitching] Video device lost');
          onDeviceLost('video');
        }
      }

      // Check if audio device was lost
      if (currentAudioDeviceId) {
        const audioDeviceExists = devices.some(
          (d) => d.kind === 'audioinput' && d.deviceId === currentAudioDeviceId
        );
        if (!audioDeviceExists) {
          console.log('[DeviceSwitching] Audio device lost');
          onDeviceLost('audio');
        }
      }
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [onDeviceLost]);
}
