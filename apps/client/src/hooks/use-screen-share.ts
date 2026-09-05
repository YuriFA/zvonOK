import {
  ScreenShareService,
  browserDisplayMediaService,
} from "@zvonok/client/screen-share/service";
import type { ScreenShareState } from "@zvonok/client/screen-share/types";
import { useEffect, useMemo, useState } from "react";

import { useSfuManager } from "@/features/sfu/contexts/sfu-manager.context";

export type { ScreenShareError } from "@zvonok/client/screen-share/types";

export interface UseScreenShareResult {
  isSharing: boolean;
  screenStream: MediaStream | null;
  isScreenShareBlocked: boolean;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
}

export function useScreenShare(): UseScreenShareResult {
  const sfuManager = useSfuManager();

  const service = useMemo(
    () => new ScreenShareService({ sfu: sfuManager, displayMedia: browserDisplayMediaService }),
    [sfuManager],
  );

  const [state, setState] = useState<ScreenShareState>(() => service.getState());

  useEffect(() => {
    const unsubscribe = service.onStateChange(setState);
    return () => {
      unsubscribe();
      service.destroy();
    };
  }, [service]);

  return {
    isSharing: state.isSharing,
    screenStream: state.screenStream,
    isScreenShareBlocked: state.isScreenShareBlocked,
    startScreenShare: () => service.start(),
    stopScreenShare: () => service.stop(),
  };
}
