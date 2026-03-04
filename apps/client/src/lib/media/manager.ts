export type MediaStatus = 'idle' | 'starting' | 'active' | 'stopped' | 'error';

export type MediaStatusCallback = (status: MediaStatus) => void;

export interface MediaStreamConstraints {
  video?: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
}

const defaultConstraints: MediaStreamConstraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user',
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

export type DeviceSwitchCallback = (kind: 'video' | 'audio', deviceId: string) => void;

export class MediaStreamManager {
  private localStream: MediaStream | null = null;
  private status: MediaStatus = 'idle';
  private statusCallbacks: Set<MediaStatusCallback> = new Set();
  private error: Error | null = null;
  private deviceSwitchCallbacks: Set<DeviceSwitchCallback> = new Set();

  async startStream(constraints?: MediaStreamConstraints): Promise<MediaStream> {
    if (this.localStream) {
      return this.localStream;
    }

    this.setStatus('starting');
    this.error = null;

    const mergedConstraints: MediaStreamConstraints = {
      video: constraints?.video ?? defaultConstraints.video,
      audio: constraints?.audio ?? defaultConstraints.audio,
    };

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(mergedConstraints);
      this.setStatus('active');
      return this.localStream;
    } catch (err) {
      this.error = err instanceof Error ? err : new Error('Failed to get media stream');
      this.setStatus('error');
      throw this.error;
    }
  }

  stopStream(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    this.setStatus('stopped');
  }

  getStream(): MediaStream | null {
    return this.localStream;
  }

  getVideoTracks(): MediaStreamTrack[] {
    return this.localStream?.getVideoTracks() ?? [];
  }

  getAudioTracks(): MediaStreamTrack[] {
    return this.localStream?.getAudioTracks() ?? [];
  }

  toggleVideo(enabled: boolean): void {
    this.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  toggleAudio(enabled: boolean): void {
    this.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  isVideoEnabled(): boolean {
    const tracks = this.getVideoTracks();
    return tracks.length > 0 && tracks.every((track) => track.enabled);
  }

  isAudioEnabled(): boolean {
    const tracks = this.getAudioTracks();
    return tracks.length > 0 && tracks.every((track) => track.enabled);
  }

  private setStatus(status: MediaStatus): void {
    this.status = status;
    this.statusCallbacks.forEach((callback) => callback(status));
  }

  onStatusChange(callback: MediaStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    callback(this.status);
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  getStatus(): MediaStatus {
    return this.status;
  }

  getError(): Error | null {
    return this.error;
  }

  hasActiveStream(): boolean {
    return this.localStream !== null && this.status === 'active';
  }

  /**
   * Switch video input device (camera).
   * Returns the new track or null on failure.
   */
  async switchVideoDevice(deviceId: string): Promise<MediaStreamTrack | null> {
    if (!this.localStream) {
      console.error('[Media] No active stream to switch video device');
      return null;
    }

    // Try with exact deviceId first
    let newStream: MediaStream;
    try {
      newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
      });
    } catch {
      // Fallback to default video device
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
      newStream.getTracks().forEach((t) => t.stop());
      return null;
    }

    // Stop old video tracks
    this.localStream.getVideoTracks().forEach((track) => track.stop());

    // Remove old video tracks and add new one
    this.localStream.getVideoTracks().forEach((track) => {
      this.localStream!.removeTrack(track);
    });
    this.localStream.addTrack(newTrack);

    // Clean up the temporary stream (we only needed the track)
    newStream.getAudioTracks().forEach((t) => t.stop());

    // Notify listeners
    this.deviceSwitchCallbacks.forEach((cb) => cb('video', newTrack.getSettings().deviceId || deviceId));

    return newTrack;
  }

  /**
   * Switch audio input device (microphone).
   * Returns the new track or null on failure.
   */
  async switchAudioDevice(deviceId: string): Promise<MediaStreamTrack | null> {
    if (!this.localStream) {
      console.error('[Media] No active stream to switch audio device');
      return null;
    }

    // Try with exact deviceId first
    let newStream: MediaStream;
    try {
      newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
      });
    } catch {
      // Fallback to default audio device
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
      newStream.getTracks().forEach((t) => t.stop());
      return null;
    }

    // Stop old audio tracks
    this.localStream.getAudioTracks().forEach((track) => track.stop());

    // Remove old audio tracks and add new one
    this.localStream.getAudioTracks().forEach((track) => {
      this.localStream!.removeTrack(track);
    });
    this.localStream.addTrack(newTrack);

    // Clean up the temporary stream (we only needed the track)
    newStream.getVideoTracks().forEach((t) => t.stop());

    // Notify listeners
    this.deviceSwitchCallbacks.forEach((cb) => cb('audio', newTrack.getSettings().deviceId || deviceId));

    return newTrack;
  }

  /**
   * Subscribe to device switch events.
   */
  onDeviceSwitch(callback: DeviceSwitchCallback): () => void {
    this.deviceSwitchCallbacks.add(callback);
    return () => {
      this.deviceSwitchCallbacks.delete(callback);
    };
  }

  /**
   * Get the current video track's device ID.
   */
  getVideoDeviceId(): string | null {
    const track = this.localStream?.getVideoTracks()[0];
    return track?.getSettings().deviceId ?? null;
  }

  /**
   * Get the current audio track's device ID.
   */
  getAudioDeviceId(): string | null {
    const track = this.localStream?.getAudioTracks()[0];
    return track?.getSettings().deviceId ?? null;
  }
}

export const mediaManager = new MediaStreamManager();
