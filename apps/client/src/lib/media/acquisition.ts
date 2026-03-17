/**
 * Media acquisition module.
 * Handles getUserMedia orchestration with fallback strategies.
 */

import { MediaStateStore } from './state-store';
import type { UserMediaConstraints } from './types';
import { DEFAULT_CONSTRAINTS } from './types';

/**
 * Strategy for handling acquisition errors with fallback behavior.
 */
export interface AcquisitionFallbackStrategy {
  /** Check if this strategy can handle the given error */
  canHandle(error: Error): boolean;
  /** Execute the fallback strategy */
  execute(
    error: Error,
    originalConstraints: UserMediaConstraints,
    attemptFallback: (constraints: UserMediaConstraints) => Promise<MediaStream>
  ): Promise<MediaStream>;
}

/**
 * Strategy for handling permission denied errors.
 * Falls back to audio-only mode.
 */
export class PermissionDeniedStrategy implements AcquisitionFallbackStrategy {
  canHandle(error: Error): boolean {
    return error.name === 'NotAllowedError';
  }

  async execute(
    error: Error,
    originalConstraints: UserMediaConstraints,
    attemptFallback: (constraints: UserMediaConstraints) => Promise<MediaStream>
  ): Promise<MediaStream> {
    if (originalConstraints.audio) {
      console.log('[Media] Running in audio-only mode after permission denied');
      return attemptFallback({ audio: originalConstraints.audio });
    }
    throw error;
  }
}

/**
 * Strategy for handling device not found errors.
 * Falls back to default constraints.
 */
export class DeviceNotFoundStrategy implements AcquisitionFallbackStrategy {
  canHandle(error: Error): boolean {
    return error.name === 'NotFoundError' || error.name === 'OverconstrainedError';
  }

  async execute(
    _error: Error,
    _originalConstraints: UserMediaConstraints,
    attemptFallback: (constraints: UserMediaConstraints) => Promise<MediaStream>
  ): Promise<MediaStream> {
    console.log('[Media] Device not found, trying default constraints');
    // First try video+audio defaults
    try {
      return await attemptFallback({ video: true, audio: true });
    } catch {
      // Then try audio only
      console.log('[Media] Falling back to audio only');
      return attemptFallback({ audio: true });
    }
  }
}

/**
 * Preference provider for media acquisition.
 * Allows acquisition to read preferences from an external source of truth.
 */
export interface MediaPreferenceProvider {
  isPreferredVideoEnabled(): boolean;
  isPreferredAudioEnabled(): boolean;
}

/**
 * Handles media stream acquisition with deduplication and cancellation.
 */
export class MediaAcquisition {
  private stream: MediaStream | null = null;
  private pendingPromise: Promise<MediaStream> | null = null;
  private cancelled = false;
  private stateStore: MediaStateStore;
  private fallbackStrategies: AcquisitionFallbackStrategy[];
  private preferenceProvider: MediaPreferenceProvider | null;

  constructor(
    stateStore: MediaStateStore,
    fallbackStrategies: AcquisitionFallbackStrategy[] = [],
    preferenceProvider?: MediaPreferenceProvider
  ) {
    this.stateStore = stateStore;
    this.fallbackStrategies = fallbackStrategies;
    this.preferenceProvider = preferenceProvider ?? null;
  }

  /**
   * Start acquiring a media stream.
   * Deduplicates concurrent calls (e.g., React StrictMode double-mount).
   */
  async start(constraints?: UserMediaConstraints): Promise<MediaStream> {
    this.cancelled = false;

    if (this.stream) {
      return this.stream;
    }

    if (this.pendingPromise) {
      return this.pendingPromise;
    }

    this.pendingPromise = this.doStart(constraints);
    try {
      return await this.pendingPromise;
    } finally {
      this.pendingPromise = null;
    }
  }

  private async doStart(constraints?: UserMediaConstraints): Promise<MediaStream> {
    this.stateStore.setStatus('starting');

    const merged = this.mergeConstraints(constraints);
    const wantsVideo = merged.video !== false;
    const wantsAudio = merged.audio !== false;

    if (!wantsVideo && !wantsAudio) {
      this.stream = new MediaStream();
      this.stateStore.setStatus('active');
      return this.stream;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(merged);
      this.checkCancelled(stream);

      this.stream = stream;
      this.stateStore.setStatus('active');
      return stream;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');

      if (this.cancelled) {
        this.stateStore.setStatus('stopped');
        throw new Error('Stream start was cancelled');
      }

      console.warn('[Media] Failed to get stream:', error.message);

      // Try fallback strategies
      for (const strategy of this.fallbackStrategies) {
        if (strategy.canHandle(error)) {
          try {
            const stream = await strategy.execute(error, merged, async (c) => {
              const s = await navigator.mediaDevices.getUserMedia(c);
              this.checkCancelled(s);
              return s;
            });
            this.stream = stream;
            this.stateStore.setStatus('active');
            return stream;
          } catch (fallbackErr) {
            if (this.cancelled) {
              this.stateStore.setStatus('stopped');
              throw new Error('Stream start was cancelled');
            }
            console.warn('[Media] Fallback strategy failed:', fallbackErr);
            continue;
          }
        }
      }

      // Final fallback: try audio only
      if (wantsVideo && wantsAudio) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: merged.audio,
          });
          this.checkCancelled(stream);
          this.stream = stream;
          this.stateStore.setStatus('active');
          return stream;
        } catch (audioErr) {
          console.error('[Media] Failed to get audio stream:', audioErr);
        }
      }

      this.stateStore.setStatus('error');
      throw error;
    }
  }

  private checkCancelled(stream: MediaStream): void {
    if (this.cancelled) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error('Stream start was cancelled');
    }
  }

  /**
   * Stop the current stream and cancel any pending acquisition.
   */
  stop(): void {
    this.cancelled = true;
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.stateStore.setStatus('stopped');
  }

  /**
   * Get the current stream.
   */
  getStream(): MediaStream | null {
    return this.stream;
  }

  /**
   * Get preferred video enabled state.
   */
  isPreferredVideoEnabled(): boolean {
    return this.preferenceProvider?.isPreferredVideoEnabled() ?? true;
  }

  /**
   * Get preferred audio enabled state.
   */
  isPreferredAudioEnabled(): boolean {
    return this.preferenceProvider?.isPreferredAudioEnabled() ?? true;
  }

  private mergeConstraints(constraints?: UserMediaConstraints): UserMediaConstraints {
    const preferredVideo = this.preferenceProvider?.isPreferredVideoEnabled() ?? true;
    const preferredAudio = this.preferenceProvider?.isPreferredAudioEnabled() ?? true;

    return {
      video:
        constraints?.video ??
        (preferredVideo ? DEFAULT_CONSTRAINTS.video : false),
      audio:
        constraints?.audio ??
        (preferredAudio ? DEFAULT_CONSTRAINTS.audio : false),
    };
  }
}
