/**
 * Media controls hook.
 * Uses dependency injection via MediaManagerContext.
 */

import { useCallback, useEffect, useState } from 'react';
import { useMediaManager } from '../contexts/media-manager.context';

export interface MediaControlsState {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isVideoAvailable: boolean;
  isAudioAvailable: boolean;
}

export interface UseMediaControlsReturn extends MediaControlsState {
  setVideoEnabled: (enabled: boolean) => void;
  setAudioEnabled: (enabled: boolean) => void;
}

export function useMediaControls(
): UseMediaControlsReturn {
  const manager = useMediaManager();

  const [isVideoEnabled, setIsVideoEnabled] = useState(
    () => manager.isPreferredVideoEnabled()
  );
  const [isAudioEnabled, setIsAudioEnabled] = useState(
    () => manager.isPreferredAudioEnabled()
  );
  const [isVideoAvailable, setIsVideoAvailable] = useState(
    () => manager.hasVideoTrack()
  );
  const [isAudioAvailable, setIsAudioAvailable] = useState(
    () => manager.hasAudioTrack()
  );

  useEffect(() => {
    const syncState = () => {
      const hasStream = manager.getStream() !== null;
      setIsVideoEnabled(
        hasStream ? manager.isVideoEnabled() : manager.isPreferredVideoEnabled()
      );
      setIsAudioEnabled(
        hasStream ? manager.isAudioEnabled() : manager.isPreferredAudioEnabled()
      );
      setIsVideoAvailable(manager.hasVideoTrack());
      setIsAudioAvailable(manager.hasAudioTrack());
    };

    const unsubscribeStatus = manager.onStatusChange(() => {
      syncState();
    });
    const unsubscribeVideoAvailability = manager.onVideoAvailabilityChange(
      (available) => {
        setIsVideoAvailable(available);
        setIsVideoEnabled(available && manager.isVideoEnabled());
      }
    );
    const unsubscribeAudioAvailability = manager.onAudioAvailabilityChange(
      (available) => {
        setIsAudioAvailable(available);
        setIsAudioEnabled(available && manager.isAudioEnabled());
      }
    );

    syncState();

    return () => {
      unsubscribeStatus();
      unsubscribeVideoAvailability();
      unsubscribeAudioAvailability();
    };
  }, [manager]);

  const setVideoEnabled = useCallback(
    (enabled: boolean) => {
      manager.setPreferredVideoEnabled(enabled);
      setIsVideoEnabled(enabled);
      // When enabling, optimistically assume the track will be acquired to
      // prevent a flash of the "no-device" warning while getUserMedia runs.
      // If acquisition fails the caller will call setVideoEnabled(false) and
      // the availability callback from notifyVideoAvailability will correct it.
      if (enabled) {
        setIsVideoAvailable(true);
      }
    },
    [manager]
  );

  const setAudioEnabled = useCallback(
    (enabled: boolean) => {
      manager.setPreferredAudioEnabled(enabled);
      setIsAudioEnabled(enabled);
      if (enabled) {
        setIsAudioAvailable(true);
      }
    },
    [manager]
  );

  return {
    isVideoEnabled,
    isAudioEnabled,
    isVideoAvailable,
    isAudioAvailable,
    setVideoEnabled,
    setAudioEnabled,
  };
}
