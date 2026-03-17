import { useCallback, useEffect, useState } from 'react';
import { useMediaManager } from '@/features/media/contexts/media-manager.context';
import type { MediaStatus, UserMediaConstraints } from '@/lib/media/types';

export interface UseLocalMediaOptions {
  autoStart?: boolean;
  initialVideoEnabled?: boolean;
  initialAudioEnabled?: boolean;
  constraints?: UserMediaConstraints;
}

export interface UseLocalMediaReturn {
  stream: MediaStream | null;
  status: MediaStatus;
  startStream: (constraints?: UserMediaConstraints) => Promise<MediaStream | null>;
  stopStream: () => void;
  startVideo: () => Promise<boolean>;
  stopVideo: () => void;
  startAudio: () => Promise<boolean>;
  stopAudio: () => void;
  switchVideoDevice: (deviceId: string) => Promise<boolean>;
  switchAudioDevice: (deviceId: string) => Promise<boolean>;
  getVideoDeviceId: () => string | null;
  getAudioDeviceId: () => string | null;
}

export function useLocalMedia(options: UseLocalMediaOptions = {}): UseLocalMediaReturn {
  const {
    autoStart = false,
    initialVideoEnabled = true,
    initialAudioEnabled = true,
    constraints,
  } = options;

  const mediaManager = useMediaManager();
  const [stream, setStream] = useState<MediaStream | null>(() => mediaManager.getStream());
  const [status, setStatus] = useState<MediaStatus>(() => {
    const currentStream = mediaManager.getStream();
    if (currentStream) return 'active';
    return 'idle';
  });

  useEffect(() => {
    const unsubscribeStatus = mediaManager.onStatusChange((newStatus) => {
      setStatus(newStatus);
      setStream(mediaManager.getStream());
    });

    return () => {
      unsubscribeStatus();
    };
  }, [mediaManager]);

  useEffect(() => {
    if (!autoStart) return;

    mediaManager.setPreferredVideoEnabled(initialVideoEnabled);
    mediaManager.setPreferredAudioEnabled(initialAudioEnabled);

    void mediaManager.startStream(constraints);
  }, [mediaManager, autoStart, initialVideoEnabled, initialAudioEnabled, constraints]);

  const startStream = useCallback(async (customConstraints?: UserMediaConstraints): Promise<MediaStream | null> => {
    try {
      const result = await mediaManager.startStream(customConstraints);
      return result;
    } catch (error) {
      console.error('[useLocalMedia] Failed to start stream:', error);
      return null;
    }
  }, [mediaManager]);

  const stopStream = useCallback(() => {
    mediaManager.stopStream();
  }, [mediaManager]);

  const startVideo = useCallback(async (): Promise<boolean> => {
    const track = await mediaManager.startVideoTrack();
    return track !== null;
  }, [mediaManager]);

  const stopVideo = useCallback(() => {
    mediaManager.stopVideoTrack();
  }, [mediaManager]);

  const startAudio = useCallback(async (): Promise<boolean> => {
    const track = await mediaManager.startAudioTrack();
    return track !== null;
  }, [mediaManager]);

  const stopAudio = useCallback(() => {
    mediaManager.stopAudioTrack();
  }, [mediaManager]);

  const switchVideoDevice = useCallback(async (deviceId: string): Promise<boolean> => {
    const track = await mediaManager.switchVideoDevice(deviceId);
    return track !== null;
  }, [mediaManager]);

  const switchAudioDevice = useCallback(async (deviceId: string): Promise<boolean> => {
    const track = await mediaManager.switchAudioDevice(deviceId);
    return track !== null;
  }, [mediaManager]);

  const getVideoDeviceId = useCallback(() => {
    return mediaManager.getVideoDeviceId();
  }, [mediaManager]);

  const getAudioDeviceId = useCallback(() => {
    return mediaManager.getAudioDeviceId();
  }, [mediaManager]);

  return {
    stream,
    status,
    startStream,
    stopStream,
    startVideo,
    stopVideo,
    startAudio,
    stopAudio,
    switchVideoDevice,
    switchAudioDevice,
    getVideoDeviceId,
    getAudioDeviceId,
  };
}
