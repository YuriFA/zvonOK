import { useCallback, useState } from "react";

import { useCaptureTrackProvider } from "@/features/media/contexts/media-manager.context";
import { useSfuManager } from "@/features/sfu/contexts/sfu-manager.context";

export type ScreenShareError = "cancelled" | "denied" | "unsupported";

export type ScreenShareState = "idle" | "starting" | "sharing";

export interface UseScreenShareResult {
  isSharing: boolean;
  /** Resolves normally on success. Throws `ScreenShareError` string on failure. */
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
}

export function useScreenShare(): UseScreenShareResult {
  const sfuManager = useSfuManager();
  const videoTrackProvider = useCaptureTrackProvider("video");
  const [isSharing, setIsSharing] = useState(false);

  const stopScreenShare = useCallback(async () => {
    const cameraTrack = videoTrackProvider.getTrack();
    const success = await sfuManager.replaceTrack("video", cameraTrack ?? null);
    if (!success) {
      throw "denied" satisfies ScreenShareError;
    }
    setIsSharing(false);
  }, [sfuManager, videoTrackProvider]);

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
        // NotAllowedError covers both user-cancel and permission-denied.
        // We surface it as "denied" so callers can show appropriate UI.
        throw "denied" satisfies ScreenShareError;
      }
      // Unknown errors — surface as denied to avoid silent failures
      throw "denied" satisfies ScreenShareError;
    }

    const screenTrack = stream.getVideoTracks()[0];
    if (!screenTrack) {
      return;
    }

    const success = await sfuManager.replaceTrack("video", screenTrack);
    if (!success) {
      screenTrack.stop();
      throw "denied" satisfies ScreenShareError;
    }

    setIsSharing(true);

    // Auto-stop when the user clicks the browser's built-in "Stop sharing" button
    screenTrack.addEventListener("ended", () => void stopScreenShare(), { once: true });
  }, [sfuManager, stopScreenShare]);

  return { isSharing, startScreenShare, stopScreenShare };
}
