import { useState, useEffect, useCallback, useRef } from 'react';
import { mediaManager } from '@/lib/media/manager';
import type { MediaPermissionStatus, StartStreamResult } from '@/lib/media/manager';
import type { MutableRefObject } from 'react';

export interface UseMediaPermissionsOptions {
  /**
   * Preserve an active managed stream across component unmount.
   * Used by the room pre-join flow when transitioning into the active call.
   */
  preserveStreamOnUnmountRef?: MutableRefObject<boolean>;
}

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

function stopManagedOrStaleStream(stream: MediaStream | null): void {
  if (!stream) {
    return;
  }

  if (mediaManager.getStream() === stream) {
    mediaManager.stopStream();
    return;
  }

  stream.getTracks().forEach((track) => {
    track.stop();
  });
}

/**
 * Hook for handling media device permissions with graceful degradation.
 *
 * Features:
 * - Permission checking before starting media
 * - Audio-only fallback when camera unavailable
 * - Retry logic for temporary failures
 * - Loading and error states
 */
export function useMediaPermissions(options: UseMediaPermissionsOptions = {}): UseMediaPermissionsReturn {
  const { preserveStreamOnUnmountRef } = options;
  const [permissionStatus, setPermissionStatus] = useState<MediaPermissionStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [videoUnavailableReason, setVideoUnavailableReason] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const checkPermissions = useCallback(async (): Promise<MediaPermissionStatus> => {
    if (isMountedRef.current) {
      setIsChecking(true);
    }

    try {
      const status = await mediaManager.checkPermissions();
      if (isMountedRef.current) {
        setPermissionStatus(status);
      }
      return status;
    } finally {
      if (isMountedRef.current) {
        setIsChecking(false);
      }
    }
  }, []);

  const startMedia = useCallback(async (): Promise<StartStreamResult> => {
    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const result = await mediaManager.startStreamWithFallback();
      if (isMountedRef.current) {
        setStream(result.stream);
        setIsAudioOnly(result.isAudioOnly);
        setVideoUnavailableReason(result.videoError ?? null);
      }
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start media');
      if (isMountedRef.current) {
        setError(error);
      }
      throw error;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const stopMedia = useCallback(() => {
    if (preserveStreamOnUnmountRef?.current) {
      return;
    }

    stopManagedOrStaleStream(stream ?? mediaManager.getStream());

    if (isMountedRef.current) {
      setStream(null);
      setIsAudioOnly(false);
      setVideoUnavailableReason(null);
      setError(null);
    }
  }, [preserveStreamOnUnmountRef, stream]);

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
