import { useState, useEffect } from 'react';
import { mediaManager } from '@/lib/media/manager';

export interface UseMediaStreamReturn {
  stream: MediaStream | null;
  error: string | null;
  isLoading: boolean;
  isInitialized: boolean;
}

export function useMediaStream(): UseMediaStreamReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const getStream = async () => {
      try {
        const newStream = await mediaManager.startStream();

        setStream(newStream);
        setIsInitialized(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to access camera/microphone';
        setError(message);
        console.error('Failed to start media stream:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getStream();

    return () => {
      mediaManager.stopStream();
    };
  }, []);

  return {
    stream,
    error,
    isLoading,
    isInitialized,
  };
}
