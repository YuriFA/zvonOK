import { useCallback, useEffect, useState } from "react";

import { useSfuManager } from "@/features/sfu/contexts/sfu-manager.context";
import { SfuProduceError } from "@/lib/sfu/types";

export type ScreenShareError = "cancelled" | "denied" | "unsupported" | "blocked";

export type ScreenShareState = "idle" | "starting" | "sharing";

export interface UseScreenShareResult {
  isSharing: boolean;
  screenStream: MediaStream | null;
  isScreenShareBlocked: boolean;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
}

export function useScreenShare(): UseScreenShareResult {
  const sfuManager = useSfuManager();
  const [isSharing, setIsSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isScreenShareBlocked, setIsScreenShareBlocked] = useState(false);

  // Keep isScreenShareBlocked in sync with SfuManager state changes.
  useEffect(() => {
    const unsubscribe = sfuManager.onStateChange((state) => {
      setIsScreenShareBlocked(state.isScreenShareBlocked);
    });
    return unsubscribe;
  }, [sfuManager]);

  const stopScreenShare = useCallback(async () => {
    sfuManager.closeScreenProducer();
    setScreenStream((current) => {
      for (const track of current?.getTracks() ?? []) {
        track.stop();
      }
      return null;
    });
    setIsSharing(false);
  }, [sfuManager]);

  const startScreenShare = useCallback(async () => {
    let stream: MediaStream;

    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as MediaTrackConstraints,
        audio: false,
      });
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === "NotSupportedError") {
          throw "unsupported" satisfies ScreenShareError;
        }
        throw "denied" satisfies ScreenShareError;
      }
      throw "denied" satisfies ScreenShareError;
    }

    const screenTrack = stream.getVideoTracks()[0];
    if (!screenTrack) {
      return;
    }

    let producer: Awaited<ReturnType<typeof sfuManager.produceScreen>>;
    try {
      producer = await sfuManager.produceScreen(screenTrack);
    } catch (error) {
      screenTrack.stop();
      if (error instanceof SfuProduceError && error.code === "SCREEN_SHARE_ALREADY_ACTIVE") {
        throw "blocked" satisfies ScreenShareError;
      }
      throw "denied" satisfies ScreenShareError;
    }

    if (!producer) {
      screenTrack.stop();
      throw "denied" satisfies ScreenShareError;
    }

    setIsSharing(true);
    setScreenStream(stream);

    screenTrack.addEventListener("ended", () => void stopScreenShare(), { once: true });
  }, [sfuManager, stopScreenShare]);

  return { isSharing, screenStream, isScreenShareBlocked, startScreenShare, stopScreenShare };
}
