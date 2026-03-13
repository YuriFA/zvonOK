import { useCallback, useEffect, useState } from 'react';
import { mediaManager } from '@/lib/media/manager';

export interface MediaControlsState {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isVideoAvailable: boolean;
  isAudioAvailable: boolean;
}

export interface UseMediaControlsReturn extends MediaControlsState {
  toggleVideo: () => Promise<boolean>;
  toggleAudio: () => Promise<boolean>;
  setVideoEnabled: (enabled: boolean) => void;
  setAudioEnabled: (enabled: boolean) => void;
}

export function useMediaControls(initialState?: Partial<MediaControlsState>): UseMediaControlsReturn {
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialState?.isVideoEnabled ?? mediaManager.isVideoEnabled());
  const [isAudioEnabled, setIsAudioEnabled] = useState(initialState?.isAudioEnabled ?? mediaManager.isAudioEnabled());
  const [isVideoAvailable, setIsVideoAvailable] = useState(initialState?.isVideoAvailable ?? mediaManager.hasVideoTrack());
  const [isAudioAvailable, setIsAudioAvailable] = useState(initialState?.isAudioAvailable ?? mediaManager.hasAudioTrack());

  useEffect(() => {
    const syncState = () => {
      setIsVideoEnabled(mediaManager.isVideoEnabled());
      setIsAudioEnabled(mediaManager.isAudioEnabled());
      setIsVideoAvailable(mediaManager.hasVideoTrack());
      setIsAudioAvailable(mediaManager.hasAudioTrack());
    };

    const unsubscribeStatus = mediaManager.onStatusChange(() => {
      syncState();
    });
    const unsubscribeVideoAvailability = mediaManager.onVideoAvailabilityChange((available) => {
      setIsVideoAvailable(available);
      setIsVideoEnabled(available && mediaManager.isVideoEnabled());
    });
    const unsubscribeAudioAvailability = mediaManager.onAudioAvailabilityChange((available) => {
      setIsAudioAvailable(available);
      setIsAudioEnabled(available && mediaManager.isAudioEnabled());
    });

    syncState();

    return () => {
      unsubscribeStatus();
      unsubscribeVideoAvailability();
      unsubscribeAudioAvailability();
    };
  }, []);

  const toggleVideo = useCallback(async () => {
    const newState = !isVideoEnabled;
    const success = await mediaManager.toggleVideo(newState);
    const hasVideoTrack = mediaManager.hasVideoTrack();

    setIsVideoEnabled(success ? newState && hasVideoTrack : false);
    setIsVideoAvailable(hasVideoTrack);

    return success;
  }, [isVideoEnabled]);

  const toggleAudio = useCallback(async () => {
    const newState = !isAudioEnabled;
    const success = await mediaManager.toggleAudio(newState);
    const hasAudioTrack = mediaManager.hasAudioTrack();

    setIsAudioEnabled(success ? newState && hasAudioTrack : false);
    setIsAudioAvailable(hasAudioTrack);

    return success;
  }, [isAudioEnabled]);

  const setVideoEnabled = useCallback((enabled: boolean) => {
    setIsVideoEnabled(enabled);
    setIsVideoAvailable(mediaManager.hasVideoTrack());
  }, []);

  const setAudioEnabled = useCallback((enabled: boolean) => {
    setIsAudioEnabled(enabled);
    setIsAudioAvailable(mediaManager.hasAudioTrack());
  }, []);

  return {
    isVideoEnabled,
    isAudioEnabled,
    isVideoAvailable,
    isAudioAvailable,
    toggleVideo,
    toggleAudio,
    setVideoEnabled,
    setAudioEnabled,
  };
}
