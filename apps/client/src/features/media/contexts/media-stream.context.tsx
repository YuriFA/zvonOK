/**
 * Media stream context.
 * Provides stream management with dependency injection.
 *
 * On mount, seeds the device selector with any previously saved device IDs
 * from localStorage so the initial getUserMedia call targets the user's
 * last-known devices instead of falling back to browser defaults.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useMediaAcquisition, useMediaDeviceSelector } from './media-manager.context';
import type { UserMediaConstraints } from '@/lib/media/types';
import { loadSelectedDevices } from '@/features/media/hooks/use-media-devices';

export interface MediaStreamContextValue {
  stream: MediaStream | null;
  error: string | null;
  isLoading: boolean;
  start: (options?: {
    deviceId?: { video?: string | null; audio?: string | null };
    constraints?: UserMediaConstraints;
  }) => Promise<void>;
  stop: () => void;
}

const MediaStreamContext = createContext<MediaStreamContextValue | null>(null);

export interface MediaStreamProviderProps {
  children: ReactNode;
}

export function MediaStreamProvider({ children }: MediaStreamProviderProps) {
  const acquisition = useMediaAcquisition();
  const deviceSelector = useMediaDeviceSelector();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const start = useCallback(
    async (options?: {
      deviceId?: { video?: string | null; audio?: string | null };
      constraints?: UserMediaConstraints;
    }) => {
      if (options?.deviceId?.video) {
        deviceSelector.setSelectedVideoDeviceId(options.deviceId.video);
      }
      if (options?.deviceId?.audio) {
        deviceSelector.setSelectedAudioDeviceId(options.deviceId.audio);
      }

      // Stop any previous (possibly failed) acquisition so the next attempt
      // starts fresh. Without this, iOS WebKit may keep the internal state as
      // 'error' and refuse to call getUserMedia again.
      acquisition.stopStream();

      setIsLoading(true);
      setError(null);

      try {
        const newStream = await acquisition.startStream(options?.constraints);
        if (!mountedRef.current) return;
        setStream(newStream);
      } catch (err) {
        if (!mountedRef.current) return;
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to access camera/microphone';
        setError(message);
        console.error('Failed to start media stream:', err);
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [acquisition, deviceSelector]
  );

  const stop = useCallback(() => {
    acquisition.stopStream();
    setStream(null);
    setError(null);
  }, [acquisition]);

  // Keep refs so the mount-only effect below can call the latest `start` and
  // `acquisition.stopStream` without listing them as deps (they are stable
  // singleton-backed callbacks but the linter cannot verify that).
  const startRef = useRef(start);
  startRef.current = start;

  const stopStreamRef = useRef(acquisition.stopStream);
  stopStreamRef.current = acquisition.stopStream;

  // Seed device selector with saved device IDs on mount, then start stream.
  //
  // iOS WebKit (Safari and Chrome on iOS) requires getUserMedia to be called
  // as a direct result of a user gesture (tap/click). A useEffect has no
  // gesture context, so the call is rejected with NotAllowedError without
  // even showing a permission prompt. On these platforms we skip the
  // auto-start and let the user tap the "Allow Camera & Microphone" button
  // rendered by DeviceSelector when an error or no stream is present.
  useEffect(() => {
    if (!mountedRef.current) return;

    const isIOSWebKit =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (!isIOSWebKit) {
      const saved = loadSelectedDevices();
      startRef.current({ deviceId: { video: saved.videoDeviceId, audio: saved.audioDeviceId } });
    }

    return () => {
      stopStreamRef.current();
    };
  }, []);

  return (
    <MediaStreamContext.Provider value={{ stream, error, isLoading, start, stop }}>
      {children}
    </MediaStreamContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMediaStreamContext(): MediaStreamContextValue {
  const ctx = useContext(MediaStreamContext);
  if (!ctx) {
    throw new Error(
      'useMediaStreamContext must be used within a MediaStreamProvider'
    );
  }
  return ctx;
}
