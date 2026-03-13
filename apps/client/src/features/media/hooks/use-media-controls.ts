import { useState, useCallback, useEffect } from 'react';
import { mediaManager } from '@/lib/media/manager';

const STORAGE_KEY = 'webrtc-media-controls';

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

function loadPersistedState(): MediaControlsState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        isVideoEnabled: parsed.isVideoEnabled ?? true,
        isAudioEnabled: parsed.isAudioEnabled ?? true,
      };
    }
  } catch {
    // Ignore parse errors
  }
  return { isVideoEnabled: true, isAudioEnabled: true };
}

function savePersistedState(state: MediaControlsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export function useMediaControls(initialState?: Partial<MediaControlsState>): UseMediaControlsReturn {
  const persistedState = loadPersistedState();
  const [isVideoEnabled, setIsVideoEnabled] = useState(
    initialState?.isVideoEnabled ?? persistedState.isVideoEnabled
  );
  const [isAudioEnabled, setIsAudioEnabled] = useState(
    initialState?.isAudioEnabled ?? persistedState.isAudioEnabled
  );

  // Persist state changes
  useEffect(() => {
    savePersistedState({ isVideoEnabled, isAudioEnabled });
  }, [isVideoEnabled, isAudioEnabled]);

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
