/**
 * ScreenShareService — framework-agnostic screen share orchestrator.
 *
 * Responsibilities (SRP):
 *   1. Capture display media via IDisplayMediaService
 *   2. Manage SFU screen producer lifecycle via IScreenShareSfuPort
 *   3. Maintain and broadcast ScreenShareState
 *
 * All React dependencies live in the useScreenShare hook (thin adapter).
 */

import type {
  IDisplayMediaService,
  IScreenShareService,
  IScreenShareSfuPort,
  ScreenShareError,
  ScreenShareState,
  ScreenShareStateCallback,
} from "./types.js";

export interface ScreenShareServiceOptions {
  sfu: IScreenShareSfuPort;
  displayMedia: IDisplayMediaService;
}

export class ScreenShareService implements IScreenShareService {
  private readonly sfu: IScreenShareSfuPort;
  private readonly displayMedia: IDisplayMediaService;

  private state: ScreenShareState = {
    isSharing: false,
    screenStream: null,
    isScreenShareBlocked: false,
  };

  private readonly callbacks = new Set<ScreenShareStateCallback>();
  private sfuUnsubscribe: (() => void) | null = null;

  constructor({ sfu, displayMedia }: ScreenShareServiceOptions) {
    this.sfu = sfu;
    this.displayMedia = displayMedia;

    // Subscribe to SFU state changes to keep isScreenShareBlocked in sync.
    this.sfuUnsubscribe = this.sfu.onStateChange((sfuState) => {
      if (this.state.isScreenShareBlocked !== sfuState.isScreenShareBlocked) {
        this.updateState({ isScreenShareBlocked: sfuState.isScreenShareBlocked });
      }
    });
  }

  getState(): ScreenShareState {
    return { ...this.state };
  }

  onStateChange(cb: ScreenShareStateCallback): () => void {
    this.callbacks.add(cb);
    cb(this.getState());
    return () => this.callbacks.delete(cb);
  }

  async start(): Promise<void> {
    let stream: MediaStream;

    try {
      stream = await this.displayMedia.getDisplayMedia({
        video: { cursor: "always" } as MediaTrackConstraints,
        audio: false,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotSupportedError") {
        throw "unsupported" satisfies ScreenShareError;
      }
      throw "denied" satisfies ScreenShareError;
    }

    const screenTrack = stream.getVideoTracks()[0];
    if (!screenTrack) {
      return;
    }

    try {
      const producer = await this.sfu.produceScreen(screenTrack);
      if (!producer) {
        screenTrack.stop();
        throw "denied" satisfies ScreenShareError;
      }
    } catch (error) {
      screenTrack.stop();
      if (isBlockedError(error)) {
        throw "blocked" satisfies ScreenShareError;
      }
      if (isScreenShareError(error)) {
        throw error;
      }
      throw "denied" satisfies ScreenShareError;
    }

    this.updateState({ isSharing: true, screenStream: stream });

    screenTrack.addEventListener("ended", () => this.stop(), { once: true });
  }

  stop(): void {
    this.sfu.closeScreenProducer();
    const { screenStream } = this.state;
    for (const track of screenStream?.getTracks() ?? []) {
      track.stop();
    }
    this.updateState({ isSharing: false, screenStream: null });
  }

  /**
   * Tear down SFU subscription. Call when the service is no longer needed.
   */
  destroy(): void {
    if (this.state.isSharing) {
      this.stop();
    }
    this.sfuUnsubscribe?.();
    this.sfuUnsubscribe = null;
    this.callbacks.clear();
  }

  private updateState(partial: Partial<ScreenShareState>): void {
    this.state = { ...this.state, ...partial };
    const snapshot = this.getState();
    for (const cb of this.callbacks) {
      cb(snapshot);
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SCREEN_SHARE_ERRORS = new Set<ScreenShareError>([
  "cancelled",
  "denied",
  "unsupported",
  "blocked",
]);

function isScreenShareError(value: unknown): value is ScreenShareError {
  return typeof value === "string" && SCREEN_SHARE_ERRORS.has(value as ScreenShareError);
}

function isBlockedError(value: unknown): boolean {
  // Matches SfuProduceError with code "SCREEN_SHARE_ALREADY_ACTIVE"
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    (value as { code: string }).code === "SCREEN_SHARE_ALREADY_ACTIVE"
  );
}

/**
 * Default IDisplayMediaService backed by navigator.mediaDevices.
 * Kept here so the hook can pass it without knowing browser API details.
 */
export const browserDisplayMediaService: IDisplayMediaService = {
  getDisplayMedia: (constraints) => navigator.mediaDevices.getDisplayMedia(constraints),
};
