import { useEffect } from "react";

import { useCaptureTrackProvider } from "@/features/media/contexts/media-manager.context";
import { useSfuManager } from "@/features/sfu/contexts/sfu-manager.context";
import { CaptureState } from "@/lib/media/capture-state";

export function useSfuTrackSync(): void {
  const videoTrackProvider = useCaptureTrackProvider("video");
  const audioTrackProvider = useCaptureTrackProvider("audio");
  const sfuManager = useSfuManager();

  useEffect(() => {
    return videoTrackProvider.onStateChange(async (state, track) => {
      if (state === CaptureState.ACTIVE && track && sfuManager.getProducerByKind("video")) {
        await sfuManager.replaceTrack("video", track);
      }
    });
  }, [videoTrackProvider, sfuManager]);

  useEffect(() => {
    return audioTrackProvider.onStateChange(async (state, track) => {
      if (state === CaptureState.ACTIVE && track && sfuManager.getProducerByKind("audio")) {
        await sfuManager.replaceTrack("audio", track);
      }
    });
  }, [audioTrackProvider, sfuManager]);
}
