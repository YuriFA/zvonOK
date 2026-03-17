/**
 * Media track controller.
 * Handles individual track lifecycle: start/stop/replace operations.
 */

import { MediaStateStore } from './state-store';
import {
  DEFAULT_VIDEO_CONSTRAINTS,
  DEFAULT_AUDIO_CONSTRAINTS,
} from './types';

/**
 * Controller for individual media track lifecycle.
 */
export class MediaTrackController {
  private preferredVideoEnabled = true;
  private preferredAudioEnabled = true;
  private selectedVideoDeviceId: string | null = null;
  private selectedAudioDeviceId: string | null = null;
  private getStream: () => MediaStream | null;
  private stateStore: MediaStateStore;

  constructor(
    getStream: () => MediaStream | null,
    stateStore: MediaStateStore
  ) {
    this.getStream = getStream;
    this.stateStore = stateStore;
  }

  // Video track management
  async startVideoTrack(): Promise<MediaStreamTrack | null> {
    const stream = this.getStream();
    if (!stream) {
      console.error('[Media] No active stream to add video track');
      return null;
    }

    this.preferredVideoEnabled = true;

    const existing = stream.getVideoTracks()[0];
    // BUG FIX: Check readyState to avoid returning a stopped (ended) track
    if (existing && existing.readyState !== 'ended') {
      existing.enabled = true;
      this.stateStore.notifyVideoAvailability(true);
      return existing;
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: this.buildVideoConstraints(this.selectedVideoDeviceId),
      });
      const track = newStream.getVideoTracks()[0];
      if (!track) {
        newStream.getTracks().forEach((t) => t.stop());
        return null;
      }
      this.selectedVideoDeviceId = track.getSettings().deviceId ?? null;
      stream.addTrack(track);
      this.stateStore.notifyVideoAvailability(true);
      newStream.getAudioTracks().forEach((t) => t.stop());
      return track;
    } catch (err) {
      console.error('[Media] Failed to re-acquire video track:', err);
      this.stateStore.notifyVideoAvailability(
        false,
        err instanceof Error ? err.message : 'Failed to access camera'
      );
      return null;
    }
  }

  stopVideoTrack(reason = 'Camera turned off'): void {
    const stream = this.getStream();
    this.preferredVideoEnabled = false;

    if (!stream) {
      this.stateStore.notifyVideoAvailability(false, reason);
      return;
    }

    const tracks = stream.getVideoTracks();
    if (tracks.length === 0) {
      this.stateStore.notifyVideoAvailability(false, reason);
      return;
    }

    console.log(
      '[Media] Stopping video track. Current tracks:',
      tracks.map((track) => track.id)
    );

    // Preserve the device ID before stopping so getVideoDeviceId()
    // can still return it while the track kind is disabled.
    const lastDeviceId = tracks[0]?.getSettings().deviceId;
    if (lastDeviceId && !this.selectedVideoDeviceId) {
      this.selectedVideoDeviceId = lastDeviceId;
    }

    tracks.forEach((track) => {
      track.stop();
      console.log('[Media] Stopping video track:', track.id, 'Reason:', reason);
      stream.removeTrack(track);
    });

    this.stateStore.notifyVideoAvailability(false, reason);
    console.log(
      '[Media] Video track stopped. Remaining video tracks:',
      stream.getVideoTracks().length
    );
  }

  // Audio track management
  async startAudioTrack(): Promise<MediaStreamTrack | null> {
    const stream = this.getStream();
    if (!stream) {
      console.error('[Media] No active stream to add audio track');
      return null;
    }

    this.preferredAudioEnabled = true;

    const existing = stream.getAudioTracks()[0];
    if (existing && existing.readyState !== 'ended') {
      existing.enabled = true;
      this.stateStore.notifyAudioAvailability(true);
      return existing;
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: this.buildAudioConstraints(this.selectedAudioDeviceId),
      });
      const track = newStream.getAudioTracks()[0];
      if (!track) {
        newStream.getTracks().forEach((t) => t.stop());
        return null;
      }
      this.selectedAudioDeviceId = track.getSettings().deviceId ?? null;
      stream.addTrack(track);
      this.stateStore.notifyAudioAvailability(true);
      newStream.getVideoTracks().forEach((t) => t.stop());
      return track;
    } catch (err) {
      console.error('[Media] Failed to re-acquire audio track:', err);
      this.stateStore.notifyAudioAvailability(
        false,
        err instanceof Error ? err.message : 'Failed to access microphone'
      );
      return null;
    }
  }

  stopAudioTrack(reason = 'Microphone turned off'): void {
    const stream = this.getStream();
    this.preferredAudioEnabled = false;

    if (!stream) {
      this.stateStore.notifyAudioAvailability(false, reason);
      return;
    }

    const tracks = stream.getAudioTracks();
    if (tracks.length === 0) {
      this.stateStore.notifyAudioAvailability(false, reason);
      return;
    }

    // Preserve the device ID before stopping so getAudioDeviceId()
    // can still return it while the track kind is disabled.
    const lastDeviceId = tracks[0]?.getSettings().deviceId;
    if (lastDeviceId && !this.selectedAudioDeviceId) {
      this.selectedAudioDeviceId = lastDeviceId;
    }

    tracks.forEach((track) => {
      console.log('[Media] Stopping audio track:', track.id, 'Reason:', reason);
      track.stop();
      stream.removeTrack(track);
    });

    this.stateStore.notifyAudioAvailability(false, reason);
  }

  // Track queries
  hasVideoTrack(): boolean {
    return (this.getStream()?.getVideoTracks().length ?? 0) > 0;
  }

  hasAudioTrack(): boolean {
    return (this.getStream()?.getAudioTracks().length ?? 0) > 0;
  }

  isVideoEnabled(): boolean {
    const tracks = this.getStream()?.getVideoTracks() ?? [];
    return tracks.length > 0 && tracks.every((track) => track.enabled);
  }

  isAudioEnabled(): boolean {
    const tracks = this.getStream()?.getAudioTracks() ?? [];
    return tracks.length > 0 && tracks.every((track) => track.enabled);
  }

  // Preference state
  isPreferredVideoEnabled(): boolean {
    return this.preferredVideoEnabled;
  }

  isPreferredAudioEnabled(): boolean {
    return this.preferredAudioEnabled;
  }

  setPreferredVideoEnabled(enabled: boolean): void {
    this.preferredVideoEnabled = enabled;
  }

  setPreferredAudioEnabled(enabled: boolean): void {
    this.preferredAudioEnabled = enabled;
  }

  // Device management
  getVideoDeviceId(): string | null {
    const track = this.getStream()?.getVideoTracks()[0];
    return track?.getSettings().deviceId ?? this.selectedVideoDeviceId;
  }

  getAudioDeviceId(): string | null {
    const track = this.getStream()?.getAudioTracks()[0];
    return track?.getSettings().deviceId ?? this.selectedAudioDeviceId;
  }

  setSelectedVideoDeviceId(deviceId: string | null): void {
    this.selectedVideoDeviceId = deviceId;
  }

  setSelectedAudioDeviceId(deviceId: string | null): void {
    this.selectedAudioDeviceId = deviceId;
  }

  // Device switching
  async switchVideoDevice(deviceId: string): Promise<MediaStreamTrack | null> {
    const stream = this.getStream();
    this.selectedVideoDeviceId = deviceId;

    if (!stream || !this.hasVideoTrack()) {
      return null;
    }

    let newStream: MediaStream;
    try {
      newStream = await navigator.mediaDevices.getUserMedia({
        video: this.buildVideoConstraints(deviceId),
      });
    } catch {
      console.warn('[Media] Failed to get video device, falling back to default');
      try {
        newStream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (err) {
        console.error('[Media] Failed to get any video device:', err);
        return null;
      }
    }

    const newTrack = newStream.getVideoTracks()[0];
    if (!newTrack) {
      console.error('[Media] No video track in new stream');
      newStream.getTracks().forEach((track) => track.stop());
      return null;
    }

    stream.getVideoTracks().forEach((track) => {
      track.stop();
      stream.removeTrack(track);
    });

    stream.addTrack(newTrack);
    this.selectedVideoDeviceId = newTrack.getSettings().deviceId ?? deviceId;
    this.stateStore.notifyVideoAvailability(true);

    newStream.getAudioTracks().forEach((track) => track.stop());

    return newTrack;
  }

  async switchAudioDevice(deviceId: string): Promise<MediaStreamTrack | null> {
    const stream = this.getStream();
    this.selectedAudioDeviceId = deviceId;

    if (!stream || !this.hasAudioTrack()) {
      return null;
    }

    let newStream: MediaStream;
    try {
      newStream = await navigator.mediaDevices.getUserMedia({
        audio: this.buildAudioConstraints(deviceId),
      });
    } catch {
      console.warn('[Media] Failed to get audio device, falling back to default');
      try {
        newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.error('[Media] Failed to get any audio device:', err);
        return null;
      }
    }

    const newTrack = newStream.getAudioTracks()[0];
    if (!newTrack) {
      console.error('[Media] No audio track in new stream');
      newStream.getTracks().forEach((track) => track.stop());
      return null;
    }

    stream.getAudioTracks().forEach((track) => {
      track.stop();
      stream.removeTrack(track);
    });

    stream.addTrack(newTrack);
    this.selectedAudioDeviceId = newTrack.getSettings().deviceId ?? deviceId;
    this.stateStore.notifyAudioAvailability(true);

    newStream.getVideoTracks().forEach((track) => track.stop());

    return newTrack;
  }

  // Constraint builders
  private buildVideoConstraints(deviceId: string | null): MediaTrackConstraints {
    return deviceId
      ? {
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      : { ...DEFAULT_VIDEO_CONSTRAINTS };
  }

  private buildAudioConstraints(deviceId: string | null): MediaTrackConstraints {
    return deviceId
      ? { deviceId: { exact: deviceId } }
      : { ...DEFAULT_AUDIO_CONSTRAINTS };
  }
}
