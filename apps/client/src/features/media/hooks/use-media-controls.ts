import { useCallback, useEffect, useState } from 'react';
import { useVideoCaptureState, useAudioCaptureState } from '../contexts/media-manager.context';
import { CaptureState, isActive } from '@/lib/media/capture-state';

export interface UseMediaControlsReturn {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  videoCaptureState: CaptureState;
  audioCaptureState: CaptureState;
  getVideoCaptureState: () => CaptureState;
  getAudioCaptureState: () => CaptureState;
  setVideoEnabled: (enabled: boolean) => void;
  setAudioEnabled: (enabled: boolean) => void;
}

export function useMediaControls(): UseMediaControlsReturn {
  const videoStateReader = useVideoCaptureState();
  const audioStateReader = useAudioCaptureState();

  const [isVideoEnabled, setIsVideoEnabled] = useState(
    () => isActive(videoStateReader.getState()),
  );
  const [isAudioEnabled, setIsAudioEnabled] = useState(
    () => isActive(audioStateReader.getState()),
  );
  const [videoCaptureState, setVideoCaptureState] = useState(
    () => videoStateReader.getState(),
  );
  const [audioCaptureState, setAudioCaptureState] = useState(
    () => audioStateReader.getState(),
  );

  useEffect(() => {
    const unsubVideo = videoStateReader.onStateChange((state) => {
      setVideoCaptureState(state);
      setIsVideoEnabled(isActive(state));
    });
    const unsubAudio = audioStateReader.onStateChange((state) => {
      setAudioCaptureState(state);
      setIsAudioEnabled(isActive(state));
    });
    return () => {
      unsubVideo();
      unsubAudio();
    };
  }, [videoStateReader, audioStateReader]);

  const getVideoCaptureState = useCallback(
    () => videoStateReader.getState(),
    [videoStateReader],
  );

  const getAudioCaptureState = useCallback(
    () => audioStateReader.getState(),
    [audioStateReader],
  );

  const setVideoEnabled = useCallback(
    (enabled: boolean) => {
      setIsVideoEnabled(enabled);
    },
    [],
  );

  const setAudioEnabled = useCallback(
    (enabled: boolean) => {
      setIsAudioEnabled(enabled);
    },
    [],
  );

  return {
    isVideoEnabled,
    isAudioEnabled,
    videoCaptureState,
    audioCaptureState,
    getVideoCaptureState,
    getAudioCaptureState,
    setVideoEnabled,
    setAudioEnabled,
  };
}
