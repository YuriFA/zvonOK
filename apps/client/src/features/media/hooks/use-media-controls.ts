import { useState, useCallback } from 'react';
import { mediaManager } from '@/lib/media';

export interface MediaControlsState {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

export interface UseMediaControlsReturn extends MediaControlsState {
  toggleVideo: () => void;
  toggleAudio: () => void;
  setVideoEnabled: (enabled: boolean) => void;
  setAudioEnabled: (enabled: boolean) => void;
}

export function useMediaControls(initialState?: Partial<MediaControlsState>): UseMediaControlsReturn {
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialState?.isVideoEnabled ?? true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(initialState?.isAudioEnabled ?? true);

  const toggleVideo = useCallback(() => {
    const newState = !isVideoEnabled;
    mediaManager.toggleVideo(newState);
    setIsVideoEnabled(newState);
  }, [isVideoEnabled]);

  const toggleAudio = useCallback(() => {
    const newState = !isAudioEnabled;
    mediaManager.toggleAudio(newState);
    setIsAudioEnabled(newState);
  }, [isAudioEnabled]);

  const setVideoEnabled = useCallback((enabled: boolean) => {
    mediaManager.toggleVideo(enabled);
    setIsVideoEnabled(enabled);
  }, []);

  const setAudioEnabled = useCallback((enabled: boolean) => {
    mediaManager.toggleAudio(enabled);
    setIsAudioEnabled(enabled);
  }, []);

  return {
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    setVideoEnabled,
    setAudioEnabled,
  };
}
