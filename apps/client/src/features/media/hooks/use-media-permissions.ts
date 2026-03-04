import { useState, useEffect, useCallback } from 'react';
import {
  mediaManager,
  type MediaPermissionStatus,
  type StartStreamResult,
} from '@/lib/media';

export interface UseMediaPermissionsReturn {
  /** Permission status for camera and microphone */
  permissionStatus: MediaPermissionStatus | null;
  /** Whether permissions are being checked */
  isChecking: boolean;
  /** Check permissions manually */
  checkPermissions: () => Promise<MediaPermissionStatus>;
  /** Start media stream with graceful degradation */
  startMedia: () => Promise<StartStreamResult>;
  /** Stop media stream */
  stopMedia: () => void;
  /** Whether currently in audio-only mode */
  isAudioOnly: boolean;
  /** Reason why video is unavailable (if in audio-only mode) */
  videoUnavailableReason: string | null;
  /** Current media stream */
  stream: MediaStream | null;
  /** Media error if failed to get stream */
  error: Error | null;
  /** Whether media is loading */
  isLoading: boolean;
  /** Retry getting media with optional retry count */
  retry: (maxRetries?: number) => Promise<StartStreamResult | null>;
}

const DEFAULT_RETRY_DELAY = 1000;
const DEFAULT_MAX_RETRIES = 3;

/**
 * Hook for handling media device permissions with graceful degradation.
 *
 * Features:
 * - Permission checking before starting media
 * - Audio-only fallback when camera unavailable
 * - Retry logic for temporary failures
 * - Loading and error states
 */
export function useMediaPermissions(): UseMediaPermissionsReturn {
  const [permissionStatus, setPermissionStatus] = useState<MediaPermissionStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [videoUnavailableReason, setVideoUnavailableReason] = useState<string | null>(null);

  const checkPermissions = useCallback(async (): Promise<MediaPermissionStatus> => {
    setIsChecking(true);
    try {
      const status = await mediaManager.checkPermissions();
      setPermissionStatus(status);
      return status;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const startMedia = useCallback(async (): Promise<StartStreamResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await mediaManager.startStreamWithFallback();
      setStream(result.stream);
      setIsAudioOnly(result.isAudioOnly);
      setVideoUnavailableReason(result.videoError ?? null);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start media');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopMedia = useCallback(() => {
    mediaManager.stopStream();
    setStream(null);
    setIsAudioOnly(false);
    setVideoUnavailableReason(null);
    setError(null);
  }, []);

  const retry = useCallback(
    async (maxRetries: number = DEFAULT_MAX_RETRIES): Promise<StartStreamResult | null> => {
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`[MediaPermissions] Retry attempt ${attempt}/${maxRetries}`);

        try {
          const result = await startMedia();
          console.log('[MediaPermissions] Retry successful');
          return result;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error('Unknown error');
          console.warn(`[MediaPermissions] Retry attempt ${attempt} failed:`, lastError.message);

          // Don't retry on permission denied - user needs to grant permission
          if (lastError.name === 'NotAllowedError') {
            console.log('[MediaPermissions] Permission denied, not retrying');
            break;
          }

          // Wait before next retry (exponential backoff)
          if (attempt < maxRetries) {
            const delay = DEFAULT_RETRY_DELAY * Math.pow(2, attempt - 1);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      setError(lastError);
      return null;
    },
    [startMedia]
  );

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  // Update audio-only state when stream changes
  useEffect(() => {
    setIsAudioOnly(mediaManager.isAudioOnly());
    setVideoUnavailableReason(mediaManager.getVideoUnavailableReason());
  }, [stream]);

  return {
    permissionStatus,
    isChecking,
    checkPermissions,
    startMedia,
    stopMedia,
    isAudioOnly,
    videoUnavailableReason,
    stream,
    error,
    isLoading,
    retry,
  };
}
