/**
 * Media controls hook.
 * Uses dependency injection via MediaManagerContext.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  useMediaTrackController,
  useMediaAcquisition,
  useMediaStateNotifier,
} from '../contexts/media-manager.context';

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
  const trackController = useMediaTrackController();
  const acquisition = useMediaAcquisition();
  const stateNotifier = useMediaStateNotifier();

  const [isVideoEnabled, setIsVideoEnabled] = useState(
    () => trackController.isPreferredVideoEnabled()
  );
  const [isAudioEnabled, setIsAudioEnabled] = useState(
    () => trackController.isPreferredAudioEnabled()
  );
  const [isVideoAvailable, setIsVideoAvailable] = useState(
    () => trackController.hasVideoTrack()
  );
  const [isAudioAvailable, setIsAudioAvailable] = useState(
    () => trackController.hasAudioTrack()
  );

  useEffect(() => {
    const syncState = () => {
      const hasStream = acquisition.getStream() !== null;
      setIsVideoEnabled(
        hasStream ? trackController.isVideoEnabled() : trackController.isPreferredVideoEnabled()
      );
      setIsAudioEnabled(
        hasStream ? trackController.isAudioEnabled() : trackController.isPreferredAudioEnabled()
      );
      setIsVideoAvailable(trackController.hasVideoTrack());
      setIsAudioAvailable(trackController.hasAudioTrack());
    };

    const unsubscribeStatus = stateNotifier.onStatusChange(() => {
      syncState();
    });
    const unsubscribeVideoAvailability = stateNotifier.onVideoAvailabilityChange(
      (available) => {
        setIsVideoAvailable(available);
        setIsVideoEnabled(available && trackController.isVideoEnabled());
      }
    );
    const unsubscribeAudioAvailability = stateNotifier.onAudioAvailabilityChange(
      (available) => {
        setIsAudioAvailable(available);
        setIsAudioEnabled(available && trackController.isAudioEnabled());
      }
    );

    syncState();

    return () => {
      unsubscribeStatus();
      unsubscribeVideoAvailability();
      unsubscribeAudioAvailability();
    };
  }, [trackController, acquisition, stateNotifier]);

  const setVideoEnabled = useCallback(
    (enabled: boolean) => {
      trackController.setPreferredVideoEnabled(enabled);
      setIsVideoEnabled(enabled);
      // When enabling, optimistically assume the track will be acquired to
      // prevent a flash of the "no-device" warning while getUserMedia runs.
      // If acquisition fails the caller will call setVideoEnabled(false) and
      // the availability callback from notifyVideoAvailability will correct it.
      if (enabled) {
        setIsVideoAvailable(true);
      }
    },
    [trackController]
  );

  const setAudioEnabled = useCallback(
    (enabled: boolean) => {
      trackController.setPreferredAudioEnabled(enabled);
      setIsAudioEnabled(enabled);
      if (enabled) {
        setIsAudioAvailable(true);
      }
    },
    [trackController]
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
