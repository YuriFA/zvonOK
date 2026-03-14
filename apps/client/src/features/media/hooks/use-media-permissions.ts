import { useState, useCallback } from 'react';
import { mediaManager } from '@/lib/media/manager';



export interface UseMediaPermissionsReturn {
  startMedia: () => Promise<MediaStream>;
  stopMedia: () => void;
  stream: MediaStream | null;
  error: Error | null;
  isLoading: boolean;
}

export function useMediaPermissions(): UseMediaPermissionsReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const startMedia = useCallback(async (): Promise<MediaStream> => {
    setIsLoading(true);
    setError(null);

    try {
      const stream = await mediaManager.startStream();
      setStream(stream);
      return stream;
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
    setError(null);
  }, []);


  return {
    stream,
    startMedia,
    stopMedia,
    isLoading,
    error,
  };
}
