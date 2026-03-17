import { useMemo } from 'react';

export type MediaErrorType = 'no-device' | 'permission-denied' | 'error' | null;

export function classifyMediaError(error: string | null): MediaErrorType {
  if (!error) return null;
  const lower = error.toLowerCase();
  if (lower.includes('permission') || lower.includes('not allowed')) {
    return 'permission-denied';
  }
  if (lower.includes('not found') || lower.includes('no camera') || lower.includes('no microphone')) {
    return 'no-device';
  }
  return 'error';
}

export interface UseMediaErrorsOptions {
  streamError: string | null;
  isVideoAvailable: boolean;
  isAudioAvailable: boolean;
  /** Whether the user wants video enabled (i.e. has not deliberately turned it off). */
  isVideoEnabled: boolean;
  /** Whether the user wants audio enabled (i.e. has not deliberately turned it off). */
  isAudioEnabled: boolean;
}

export interface UseMediaErrorsReturn {
  videoError: MediaErrorType;
  audioError: MediaErrorType;
}

export function useMediaErrors({
  streamError,
  isVideoAvailable,
  isAudioAvailable,
  isVideoEnabled,
  isAudioEnabled,
}: UseMediaErrorsOptions): UseMediaErrorsReturn {
  return useMemo(() => {
    const classifiedError = classifyMediaError(streamError);

    // Only show an error when the user wants the track on but it is not available.
    // If the user deliberately disabled the track, isVideoEnabled / isAudioEnabled
    // will be false and no warning should be shown.
    const videoError: MediaErrorType =
      isVideoEnabled && !isVideoAvailable && classifiedError ? classifiedError :
      isVideoEnabled && !isVideoAvailable ? 'no-device' :
      null;

    const audioError: MediaErrorType =
      isAudioEnabled && !isAudioAvailable && classifiedError ? classifiedError :
      isAudioEnabled && !isAudioAvailable ? 'no-device' :
      null;

    return { videoError, audioError };
  }, [streamError, isVideoAvailable, isAudioAvailable, isVideoEnabled, isAudioEnabled]);
}
