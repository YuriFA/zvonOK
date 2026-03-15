import { useCallback, useEffect, useState } from 'react';
import { mediaManager } from '@/lib/media/manager';

export interface MediaControlsState {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isVideoAvailable: boolean;
  isAudioAvailable: boolean;
}

export interface UseMediaControlsReturn extends MediaControlsState {
  toggleVideo: () => void;
  toggleAudio: () => void;
  setVideoEnabled: (enabled: boolean) => void;
  setAudioEnabled: (enabled: boolean) => void;
}

export function useMediaControls(initialState?: Partial<MediaControlsState>): UseMediaControlsReturn {
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialState?.isVideoEnabled ?? mediaManager.isPreferredVideoEnabled());
  const [isAudioEnabled, setIsAudioEnabled] = useState(initialState?.isAudioEnabled ?? mediaManager.isPreferredAudioEnabled());
  const [isVideoAvailable, setIsVideoAvailable] = useState(initialState?.isVideoAvailable ?? mediaManager.hasVideoTrack());
  const [isAudioAvailable, setIsAudioAvailable] = useState(initialState?.isAudioAvailable ?? mediaManager.hasAudioTrack());

  useEffect(() => {
    const syncState = () => {
      const hasStream = mediaManager.getStream() !== null;
      setIsVideoEnabled(hasStream ? mediaManager.isVideoEnabled() : mediaManager.isPreferredVideoEnabled());
      setIsAudioEnabled(hasStream ? mediaManager.isAudioEnabled() : mediaManager.isPreferredAudioEnabled());
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


  const toggleVideo = useCallback(() => {
    mediaManager.toggleVideo(!isVideoEnabled);
  }, [isVideoEnabled]);

  const toggleAudio = useCallback(() => {
    mediaManager.toggleAudio(!isAudioEnabled);
  }, [isAudioEnabled]);

  const setVideoEnabled = useCallback((enabled: boolean) => {
    mediaManager.setPreferredVideoEnabled(enabled);
    setIsVideoEnabled(enabled);
    setIsVideoAvailable(mediaManager.hasVideoTrack());
  }, []);

  const setAudioEnabled = useCallback((enabled: boolean) => {
    mediaManager.setPreferredAudioEnabled(enabled);
    setIsAudioEnabled(enabled);
    setIsAudioAvailable(mediaManager.hasAudioTrack());
  }, []);

  return {
    isVideoEnabled,
    isAudioEnabled,
    isVideoAvailable,
    isAudioAvailable,
    toggleAudio,
    toggleVideo,
    setVideoEnabled,
    setAudioEnabled,
  };
}
