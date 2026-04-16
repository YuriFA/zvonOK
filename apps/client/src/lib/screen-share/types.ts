/**
 * Screen share module types and interfaces.
 * Framework-agnostic — no React dependencies.
 */

export type ScreenShareError = "cancelled" | "denied" | "unsupported" | "blocked";

export interface ScreenShareState {
  isSharing: boolean;
  screenStream: MediaStream | null;
  isScreenShareBlocked: boolean;
}

export type ScreenShareStateCallback = (state: ScreenShareState) => void;

/**
 * Minimal SFU surface required by ScreenShareService (Interface Segregation).
 * Consumers pass a full ISfuManager; service only sees what it needs.
 */
export interface IScreenShareSfuPort {
  onStateChange(cb: (state: { isScreenShareBlocked: boolean }) => void): () => void;
  produceScreen(track: MediaStreamTrack): Promise<unknown>;
  closeScreenProducer(): void;
}

/**
 * Abstracts navigator.mediaDevices.getDisplayMedia for testability.
 */
export interface IDisplayMediaService {
  getDisplayMedia(constraints?: DisplayMediaStreamOptions): Promise<MediaStream>;
}

export interface IScreenShareService {
  getState(): ScreenShareState;
  onStateChange(cb: ScreenShareStateCallback): () => void;
  /** Throws {@link ScreenShareError} on failure. */
  start(): Promise<void>;
  stop(): void;
}
