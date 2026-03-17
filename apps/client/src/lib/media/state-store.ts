/**
 * Media state store.
 * Manages state and callbacks for media availability and status.
 */

import type { IMediaStateStore } from './interfaces';
import type {
  MediaStatus,
  MediaStatusCallback,
  TrackAvailabilityCallback,
} from './types';

/**
 * Observable state store for media.
 * Handles status and track availability notifications.
 */
export class MediaStateStore implements IMediaStateStore {
  private status: MediaStatus = 'idle';
  private videoAvailable = false;
  private audioAvailable = false;
  private statusCallbacks = new Set<MediaStatusCallback>();
  private videoAvailabilityCallbacks = new Set<TrackAvailabilityCallback>();
  private audioAvailabilityCallbacks = new Set<TrackAvailabilityCallback>();

  // Status management
  getStatus(): MediaStatus {
    return this.status;
  }

  setStatus(status: MediaStatus): void {
    this.status = status;
    this.statusCallbacks.forEach((cb) => cb(status));
  }

  onStatusChange(callback: MediaStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    callback(this.status);
    return () => this.statusCallbacks.delete(callback);
  }

  // Video availability management
  notifyVideoAvailability(available: boolean, reason?: string): void {
    this.videoAvailable = available;
    this.videoAvailabilityCallbacks.forEach((cb) => cb(available, reason));
  }

  onVideoAvailabilityChange(callback: TrackAvailabilityCallback): () => void {
    this.videoAvailabilityCallbacks.add(callback);
    callback(this.videoAvailable);
    return () => this.videoAvailabilityCallbacks.delete(callback);
  }

  // Audio availability management
  notifyAudioAvailability(available: boolean, reason?: string): void {
    this.audioAvailable = available;
    this.audioAvailabilityCallbacks.forEach((cb) => cb(available, reason));
  }

  onAudioAvailabilityChange(callback: TrackAvailabilityCallback): () => void {
    this.audioAvailabilityCallbacks.add(callback);
    callback(this.audioAvailable);
    return () => this.audioAvailabilityCallbacks.delete(callback);
  }
}
