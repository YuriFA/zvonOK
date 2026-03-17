/**
 * Track-level fallback strategies.
 * Follows the same Strategy pattern used in acquisition.ts for stream-level
 * fallback, but applied to individual track re-acquisition scenarios
 * (e.g., re-enabling camera after hardware disconnect).
 */

/**
 * Strategy interface for handling track acquisition errors.
 * Implementations decide whether they can handle a given error and
 * provide an alternative getUserMedia attempt.
 */
export interface TrackFallbackStrategy {
  /** Check if this strategy can handle the given error */
  canHandle(error: unknown): boolean;
  /**
   * Execute the fallback: clear any stale state and retry with default
   * constraints via the provided callback.
   * @returns The acquired track, or null if the fallback also failed.
   */
  execute(
    retry: () => Promise<MediaStreamTrack | null>
  ): Promise<MediaStreamTrack | null>;
}

/**
 * Handles the case where a previously-selected device is no longer available
 * (disconnected USB camera, revoked Bluetooth mic, etc.).
 *
 * Matches OverconstrainedError and NotFoundError — the two errors browsers
 * throw when a deviceId constraint cannot be satisfied.
 */
export class DeviceGoneFallbackStrategy implements TrackFallbackStrategy {
  canHandle(error: unknown): boolean {
    return (
      error instanceof DOMException &&
      (error.name === 'NotFoundError' || error.name === 'OverconstrainedError')
    );
  }

  async execute(
    retry: () => Promise<MediaStreamTrack | null>
  ): Promise<MediaStreamTrack | null> {
    try {
      return await retry();
    } catch (fallbackErr) {
      console.error('[Media] Fallback also failed:', fallbackErr);
      return null;
    }
  }
}
