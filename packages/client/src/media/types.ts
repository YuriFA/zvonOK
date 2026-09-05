import type { CaptureState } from "./capture-state";

export type StateCallback = (
  state: CaptureState,
  track: MediaStreamTrack | null,
  reason?: string,
) => void;
