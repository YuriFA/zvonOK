/**
 * Media track controller.
 * Handles individual track lifecycle: start/stop/replace operations.
 *
 * Responsibilities after SRP extraction:
 * - Track start/stop with fallback via injected strategies (OCP)
 * - Device selection state (selectedVideoDeviceId / selectedAudioDeviceId)
 * - Preference state (preferredVideoEnabled / preferredAudioEnabled)
 * - Hardware disconnect detection (track.onended)
 *
 * Device switching is delegated to the injected DeviceSwitcher (SRP).
 */

import type { IMediaStateStore } from './interfaces';
import type { TrackFallbackStrategy } from './track-fallback';
import type { DeviceSwitcher } from './device-switcher';
import { DEFAULT_AUDIO_CONSTRAINTS, DEFAULT_VIDEO_CONSTRAINTS } from '../config/media';

/**
 * Controller for individual media track lifecycle.
 */
export class MediaTrackController {
  private preferredVideoEnabled = true;
  private preferredAudioEnabled = true;
  private selectedVideoDeviceId: string | null = null;
  private selectedAudioDeviceId: string | null = null;
  private getStream: () => MediaStream | null;
  private stateStore: IMediaStateStore;
  private fallbackStrategies: TrackFallbackStrategy[];
  private deviceSwitcher: DeviceSwitcher;

  constructor(
    getStream: () => MediaStream | null,
    stateStore: IMediaStateStore,
    fallbackStrategies: TrackFallbackStrategy[] = [],
    deviceSwitcher: DeviceSwitcher,
  ) {
    this.getStream = getStream;
    this.stateStore = stateStore;
    this.fallbackStrategies = fallbackStrategies;
    this.deviceSwitcher = deviceSwitcher;
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
      this.attachVideoTrackEndedHandler(track, stream);
      this.stateStore.notifyVideoAvailability(true);
      newStream.getAudioTracks().forEach((t) => t.stop());
      return track;
    } catch (err) {
      // Try injected fallback strategies (OCP: new strategies can be added
      // without modifying this class)
      if (this.selectedVideoDeviceId) {
        for (const strategy of this.fallbackStrategies) {
          if (strategy.canHandle(err)) {
            console.warn('[Media] Selected video device unavailable, trying fallback strategy');
            this.selectedVideoDeviceId = null;
            const fallbackTrack = await strategy.execute(async () => {
              const fallbackStream = await navigator.mediaDevices.getUserMedia({
                video: this.buildVideoConstraints(null),
              });
              const t = fallbackStream.getVideoTracks()[0];
              if (t) {
                this.selectedVideoDeviceId = t.getSettings().deviceId ?? null;
                stream.addTrack(t);
                this.attachVideoTrackEndedHandler(t, stream);
                this.stateStore.notifyVideoAvailability(true);
                fallbackStream.getAudioTracks().forEach((at) => at.stop());
                return t;
              }
              fallbackStream.getTracks().forEach((at) => at.stop());
              return null;
            });
            if (fallbackTrack) return fallbackTrack;
            break; // Only try one matching strategy
          }
        }
      }

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

    // Preserve the actual device ID before stopping so getVideoDeviceId()
    // can still return it while the track kind is disabled.  Always update
    // so that stale IDs (e.g. from a fallback during initial acquisition)
    // are replaced with the device the user was actually seeing.
    const lastDeviceId = tracks[0]?.getSettings().deviceId;
    if (lastDeviceId) {
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
      this.attachAudioTrackEndedHandler(track, stream);
      this.stateStore.notifyAudioAvailability(true);
      newStream.getVideoTracks().forEach((t) => t.stop());
      return track;
    } catch (err) {
      // Try injected fallback strategies (OCP)
      if (this.selectedAudioDeviceId) {
        for (const strategy of this.fallbackStrategies) {
          if (strategy.canHandle(err)) {
            console.warn('[Media] Selected audio device unavailable, trying fallback strategy');
            this.selectedAudioDeviceId = null;
            const fallbackTrack = await strategy.execute(async () => {
              const fallbackStream = await navigator.mediaDevices.getUserMedia({
                audio: this.buildAudioConstraints(null),
              });
              const t = fallbackStream.getAudioTracks()[0];
              if (t) {
                this.selectedAudioDeviceId = t.getSettings().deviceId ?? null;
                stream.addTrack(t);
                this.attachAudioTrackEndedHandler(t, stream);
                this.stateStore.notifyAudioAvailability(true);
                fallbackStream.getVideoTracks().forEach((vt) => vt.stop());
                return t;
              }
              fallbackStream.getTracks().forEach((at) => at.stop());
              return null;
            });
            if (fallbackTrack) return fallbackTrack;
            break;
          }
        }
      }

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

    // Preserve the actual device ID before stopping so getAudioDeviceId()
    // can still return it while the track kind is disabled.  Always update
    // so that stale IDs (e.g. from a fallback during initial acquisition)
    // are replaced with the device the user was actually using.
    const lastDeviceId = tracks[0]?.getSettings().deviceId;
    if (lastDeviceId) {
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
    const tracks = this.getStream()?.getVideoTracks() ?? [];
    return tracks.some((t) => t.readyState !== 'ended');
  }

  hasAudioTrack(): boolean {
    const tracks = this.getStream()?.getAudioTracks() ?? [];
    return tracks.some((t) => t.readyState !== 'ended');
  }

  isVideoEnabled(): boolean {
    const tracks = this.getStream()?.getVideoTracks() ?? [];
    const live = tracks.filter((t) => t.readyState !== 'ended');
    return live.length > 0 && live.every((track) => track.enabled);
  }

  isAudioEnabled(): boolean {
    const tracks = this.getStream()?.getAudioTracks() ?? [];
    const live = tracks.filter((t) => t.readyState !== 'ended');
    return live.length > 0 && live.every((track) => track.enabled);
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

  // Device switching — delegates to DeviceSwitcher (SRP)
  async switchVideoDevice(deviceId: string): Promise<MediaStreamTrack | null> {
    const stream = this.getStream();
    this.selectedVideoDeviceId = deviceId;

    if (!stream) {
      return null;
    }

    const newTrack = await this.deviceSwitcher.switchVideo(
      stream,
      deviceId,
      this.hasVideoTrack(),
      (track, s) => this.attachVideoTrackEndedHandler(track, s),
    );

    if (newTrack) {
      this.selectedVideoDeviceId = newTrack.getSettings().deviceId ?? deviceId;
    }

    return newTrack;
  }

  async switchAudioDevice(deviceId: string): Promise<MediaStreamTrack | null> {
    const stream = this.getStream();
    this.selectedAudioDeviceId = deviceId;

    if (!stream) {
      return null;
    }

    const newTrack = await this.deviceSwitcher.switchAudio(
      stream,
      deviceId,
      this.hasAudioTrack(),
      (track, s) => this.attachAudioTrackEndedHandler(track, s),
    );

    if (newTrack) {
      this.selectedAudioDeviceId = newTrack.getSettings().deviceId ?? deviceId;
    }

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

  // Track ended handlers — detect hardware disconnects while track is live
  private attachVideoTrackEndedHandler(
    track: MediaStreamTrack,
    stream: MediaStream
  ): void {
    track.addEventListener('ended', () => {
      console.warn('[Media] Video track ended unexpectedly (device disconnected?)');
      stream.removeTrack(track);
      // Clear the selected device so the next toggle attempt falls back to default
      this.selectedVideoDeviceId = null;
      this.stateStore.notifyVideoAvailability(false, 'Camera disconnected');
    });
  }

  private attachAudioTrackEndedHandler(
    track: MediaStreamTrack,
    stream: MediaStream
  ): void {
    track.addEventListener('ended', () => {
      console.warn('[Media] Audio track ended unexpectedly (device disconnected?)');
      stream.removeTrack(track);
      // Clear the selected device so the next toggle attempt falls back to default
      this.selectedAudioDeviceId = null;
      this.stateStore.notifyAudioAvailability(false, 'Microphone disconnected');
    });
  }
}
