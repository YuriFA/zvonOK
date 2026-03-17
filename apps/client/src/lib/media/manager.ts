/**
 * Media manager facade.
 * Composes state store, acquisition, track controller, and permissions
 * into a unified interface implementing IMediaManager.
 */

import { MediaStateStore } from './state-store';
import {
  MediaAcquisition,
  PermissionDeniedStrategy,
  DeviceNotFoundStrategy,
} from './acquisition';
import { MediaTrackController } from './track-controller';
import { checkPermissions } from './permissions';
import type { IMediaManager } from './interfaces';
import type {
  UserMediaConstraints,
  MediaDeviceInfo,
  MediaPermissionStatus,
  MediaStatus,
  TrackAvailabilityCallback,
  MediaStatusCallback,
} from './types';

// Re-export types for backward compatibility
export type {
  MediaStatus,
  MediaStatusCallback,
  UserMediaConstraints as MediaStreamConstraints,
  MediaPermissionStatus,
  TrackAvailabilityCallback,
} from './types';

/**
 * Facade for media management.
 * Implements IMediaManager by composing focused modules.
 */
export class MediaStreamManager implements IMediaManager {
  private stateStore = new MediaStateStore();
  private trackController: MediaTrackController;
  private acquisition: MediaAcquisition;

  constructor() {
    // Track controller is the single source of truth for preferences.
    // Create it first so acquisition can reference it via callback.
    this.trackController = new MediaTrackController(
      () => this.acquisition.getStream(),
      this.stateStore
    );
    this.acquisition = new MediaAcquisition(
      this.stateStore,
      [new PermissionDeniedStrategy(), new DeviceNotFoundStrategy()],
      this.trackController
    );
  }

  // IMediaAcquisition
  async startStream(constraints?: UserMediaConstraints): Promise<MediaStream> {
    return this.acquisition.start(constraints);
  }

  stopStream(): void {
    this.acquisition.stop();
  }

  getStream(): MediaStream | null {
    return this.acquisition.getStream();
  }

  // IMediaTrackController
  async startVideoTrack(): Promise<MediaStreamTrack | null> {
    return this.trackController.startVideoTrack();
  }

  stopVideoTrack(reason?: string): void {
    this.trackController.stopVideoTrack(reason);
  }

  async startAudioTrack(): Promise<MediaStreamTrack | null> {
    return this.trackController.startAudioTrack();
  }

  stopAudioTrack(reason?: string): void {
    this.trackController.stopAudioTrack(reason);
  }

  hasVideoTrack(): boolean {
    return this.trackController.hasVideoTrack();
  }

  hasAudioTrack(): boolean {
    return this.trackController.hasAudioTrack();
  }

  isVideoEnabled(): boolean {
    return this.trackController.isVideoEnabled();
  }

  isAudioEnabled(): boolean {
    return this.trackController.isAudioEnabled();
  }

  isPreferredVideoEnabled(): boolean {
    return this.trackController.isPreferredVideoEnabled();
  }

  isPreferredAudioEnabled(): boolean {
    return this.trackController.isPreferredAudioEnabled();
  }

  setPreferredVideoEnabled(enabled: boolean): void {
    this.trackController.setPreferredVideoEnabled(enabled);
  }

  setPreferredAudioEnabled(enabled: boolean): void {
    this.trackController.setPreferredAudioEnabled(enabled);
  }

  // IMediaDeviceSelector
  async enumerateDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'videoinput' || d.kind === 'audioinput')
      .map((d) => ({
        deviceId: d.deviceId,
        kind: d.kind as 'videoinput' | 'audioinput',
        label: d.label,
      }));
  }

  async switchVideoDevice(deviceId: string): Promise<MediaStreamTrack | null> {
    return this.trackController.switchVideoDevice(deviceId);
  }

  async switchAudioDevice(deviceId: string): Promise<MediaStreamTrack | null> {
    return this.trackController.switchAudioDevice(deviceId);
  }

  getVideoDeviceId(): string | null {
    return this.trackController.getVideoDeviceId();
  }

  getAudioDeviceId(): string | null {
    return this.trackController.getAudioDeviceId();
  }

  setSelectedVideoDeviceId(deviceId: string | null): void {
    this.trackController.setSelectedVideoDeviceId(deviceId);
  }

  setSelectedAudioDeviceId(deviceId: string | null): void {
    this.trackController.setSelectedAudioDeviceId(deviceId);
  }

  // IMediaPermissionChecker
  async checkPermissions(): Promise<MediaPermissionStatus> {
    return checkPermissions();
  }

  // IMediaStateNotifier
  getStatus(): MediaStatus {
    return this.stateStore.getStatus();
  }

  onStatusChange(callback: MediaStatusCallback): () => void {
    return this.stateStore.onStatusChange(callback);
  }

  onVideoAvailabilityChange(callback: TrackAvailabilityCallback): () => void {
    return this.stateStore.onVideoAvailabilityChange(callback);
  }

  onAudioAvailabilityChange(callback: TrackAvailabilityCallback): () => void {
    return this.stateStore.onAudioAvailabilityChange(callback);
  }

  async toggleVideo(enabled: boolean): Promise<boolean> {
    if (enabled) {
      const track = await this.startVideoTrack();
      return track !== null;
    } else {
      this.stopVideoTrack();
      return true;
    }
  }

  async toggleAudio(enabled: boolean): Promise<boolean> {
    if (enabled) {
      const track = await this.startAudioTrack();
      return track !== null;
    } else {
      this.stopAudioTrack();
      return true;
    }
  }
}

/** Singleton instance for backward compatibility */
export const mediaManager = new MediaStreamManager();
