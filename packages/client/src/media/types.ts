import type { CaptureState } from "./capture-state.js";

export type StateCallback = (
  state: CaptureState,
  track: MediaStreamTrack | null,
  reason?: string,
) => void;
