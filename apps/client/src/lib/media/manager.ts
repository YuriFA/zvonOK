export type MediaStatus = 'idle' | 'starting' | 'active' | 'stopped' | 'error';

export type MediaStatusCallback = (status: MediaStatus) => void;

export interface MediaStreamConstraints {
  video?: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
}

export interface MediaPermissionStatus {
  hasVideo: boolean;
  hasAudio: boolean;
  videoPermission: PermissionState | 'unknown';
  audioPermission: PermissionState | 'unknown';
}

export interface StartStreamResult {
  stream: MediaStream;
  isAudioOnly: boolean;
  videoError?: string;
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

export type VideoAvailabilityCallback = (available: boolean, reason?: string) => void;

export type AudioAvailabilityCallback = (available: boolean, reason?: string) => void;

export class MediaStreamManager {
  private localStream: MediaStream | null = null;
  private status: MediaStatus = 'idle';
  private statusCallbacks: Set<MediaStatusCallback> = new Set();
  private error: Error | null = null;
  private isAudioOnlyMode = false;
  private videoUnavailableReason: string | null = null;
  private audioUnavailableReason: string | null = null;
  private selectedVideoDeviceId: string | null = null;
  private selectedAudioDeviceId: string | null = null;
  private videoAvailabilityCallbacks: Set<VideoAvailabilityCallback> = new Set();
  private audioAvailabilityCallbacks: Set<AudioAvailabilityCallback> = new Set();

  async startStream(constraints?: MediaStreamConstraints): Promise<MediaStream> {
    const result = await this.startStreamWithFallback(constraints);
    return result.stream;
  }

  /**
   * Start media stream with graceful degradation.
   * Falls back to audio-only if video is unavailable.
   */
  async startStreamWithFallback(constraints?: MediaStreamConstraints): Promise<StartStreamResult> {
    if (this.localStream) {
      return {
        stream: this.localStream,
        isAudioOnly: this.isAudioOnlyMode,
        videoError: this.videoUnavailableReason ?? undefined,
      };
    }

    this.setStatus('starting');
    this.error = null;
    this.isAudioOnlyMode = false;
    this.videoUnavailableReason = null;
    this.audioUnavailableReason = null;

    const mergedConstraints: MediaStreamConstraints = {
      video: constraints?.video ?? defaultConstraints.video,
      audio: constraints?.audio ?? defaultConstraints.audio,
    };
    const wantsVideo = mergedConstraints.video !== false;
    const wantsAudio = mergedConstraints.audio !== false;

    if (!wantsVideo && !wantsAudio) {
      this.localStream = new MediaStream();
      this.updateDerivedState();
      this.setStatus('active');
      this.notifyCurrentAvailability();

      return {
        stream: this.localStream,
        isAudioOnly: false,
      };
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(mergedConstraints);
      this.updateSelectedDeviceIdsFromStream(this.localStream);
      this.updateDerivedState();
      this.setStatus('active');
      this.notifyCurrentAvailability();

      return { stream: this.localStream, isAudioOnly: false };
    } catch (videoAudioError) {
      const err = videoAudioError instanceof Error ? videoAudioError : new Error('Unknown error');
      console.warn('[Media] Failed to get video+audio stream:', err.message);

      if (!wantsVideo || !wantsAudio) {
        this.error = err;
        this.setStatus('error');
        this.notifyCurrentAvailability();
        throw err;
      }

      if (err.name === 'NotAllowedError') {
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: mergedConstraints.audio,
          });
          this.updateSelectedDeviceIdsFromStream(this.localStream);
          this.isAudioOnlyMode = true;
          this.videoUnavailableReason = 'Camera permission denied or unavailable';
          this.setStatus('active');
          this.notifyCurrentAvailability();
          console.log('[Media] Running in audio-only mode');
          return {
            stream: this.localStream,
            isAudioOnly: true,
            videoError: this.videoUnavailableReason,
          };
        } catch (error) {
          console.error('[Media] Failed to get audio stream after video permission denied:', error);
          this.error = new Error('Camera and microphone permissions denied');
          this.setStatus('error');
          this.notifyCurrentAvailability();
          throw this.error;
        }
      }

      if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          this.updateSelectedDeviceIdsFromStream(this.localStream);
          this.updateDerivedState();
          this.setStatus('active');
          this.notifyCurrentAvailability();
          return { stream: this.localStream, isAudioOnly: false };
        } catch {
          try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.updateSelectedDeviceIdsFromStream(this.localStream);
            this.isAudioOnlyMode = true;
            this.videoUnavailableReason = 'No camera found';
            this.setStatus('active');
            this.notifyCurrentAvailability();
            return {
              stream: this.localStream,
              isAudioOnly: true,
              videoError: this.videoUnavailableReason,
            };
          } catch (error) {
            console.error('[Media] Failed to get audio stream after no camera found:', error);
            this.error = new Error('No camera or microphone found');
            this.setStatus('error');
            this.notifyCurrentAvailability();
            throw this.error;
          }
        }
      }

      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: mergedConstraints.audio,
        });
        this.updateSelectedDeviceIdsFromStream(this.localStream);
        this.isAudioOnlyMode = true;
        this.videoUnavailableReason = err.message;
        this.setStatus('active');
        this.notifyCurrentAvailability();
        return {
          stream: this.localStream,
          isAudioOnly: true,
          videoError: this.videoUnavailableReason,
        };
      } catch (error) {
        console.error('[Media] Failed to get audio stream after video error:', error);
        this.error = err;
        this.setStatus('error');
        this.notifyCurrentAvailability();
        throw this.error;
      }
    }
  }

  stopStream(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.localStream = null;
    }
    this.updateDerivedState();
    this.videoUnavailableReason = null;
    this.audioUnavailableReason = null;
    this.setStatus('stopped');
    this.notifyCurrentAvailability();
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

  async toggleVideo(enabled: boolean): Promise<boolean> {
    if (enabled) {
      if (this.hasVideoTrack()) {
        this.getVideoTracks().forEach((track) => {
          track.enabled = true;
        });
        this.videoUnavailableReason = null;
        this.updateDerivedState();
        this.notifyVideoAvailability(true);
        return true;
      }

      return (await this.startVideoTrack()) !== null;
    }

    if (!this.hasVideoTrack()) {
      this.videoUnavailableReason = 'Camera turned off';
      this.notifyVideoAvailability(false, this.videoUnavailableReason);
      return true;
    }

    this.stopVideoTrack();
    return true;
  }

  /**
   * Stop the video track completely (releases camera hardware).
   */
  stopVideoTrack(reason: string = 'Camera turned off'): void {
    const tracks = this.getVideoTracks();
    console.log('[Media] Stopping video track. Current tracks:', tracks.map((track) => track.id));
    this.videoUnavailableReason = reason;

    if (tracks.length === 0) {
      this.updateDerivedState();
      this.notifyVideoAvailability(false, reason);
      return;
    }

    tracks.forEach((track) => {
      track.stop();
      console.log('[Media] Stopping video track:', track.id, 'Reason:', reason);
      this.localStream?.removeTrack(track);
    });

    this.updateDerivedState();
    this.notifyVideoAvailability(false, reason);
    console.log('[Media] Video track stopped. Remaining video tracks:', this.getVideoTracks().length);
  }

  /**
   * Start/re-acquire the video track.
   * Uses the previously selected device ID if available.
   * Returns the new track, or null on failure.
   */
  async startVideoTrack(): Promise<MediaStreamTrack | null> {
    if (!this.localStream) {
      console.error('[Media] No active stream to add video track');
      return null;
    }

    const existingTrack = this.getVideoTracks()[0];
    if (existingTrack) {
      existingTrack.enabled = true;
      this.videoUnavailableReason = null;
      this.updateDerivedState();
      this.notifyVideoAvailability(true);
      return existingTrack;
    }

    const constraints = this.buildVideoConstraints(this.selectedVideoDeviceId);

    let newStream: MediaStream;
    try {
      newStream = await navigator.mediaDevices.getUserMedia({ video: constraints });
    } catch (err) {
      console.error('[Media] Failed to re-acquire video track:', err);
      this.videoUnavailableReason = err instanceof Error ? err.message : 'Failed to access camera';
      this.notifyVideoAvailability(false, this.videoUnavailableReason);
      return null;
    }

    const newTrack = newStream.getVideoTracks()[0];
    if (!newTrack) {
      console.error('[Media] No video track in new stream');
      newStream.getTracks().forEach((track) => {
        track.stop();
      });
      return null;
    }

    this.selectedVideoDeviceId = newTrack.getSettings().deviceId ?? null;
    this.localStream.addTrack(newTrack);
    this.videoUnavailableReason = null;
    this.updateDerivedState();
    this.notifyVideoAvailability(true);

    newStream.getAudioTracks().forEach((track) => {
      track.stop();
    });

    return newTrack;
  }

  /**
   * Check if video track is currently available (not stopped).
   */
  hasVideoTrack(): boolean {
    return this.getVideoTracks().length > 0;
  }

  /**
   * Set the preferred video device ID for re-acquisition.
   */
  setSelectedVideoDeviceId(deviceId: string | null): void {
    this.selectedVideoDeviceId = deviceId;
  }

  /**
   * Subscribe to video availability changes.
   */
  onVideoAvailabilityChange(callback: VideoAvailabilityCallback): () => void {
    this.videoAvailabilityCallbacks.add(callback);
    return () => {
      this.videoAvailabilityCallbacks.delete(callback);
    };
  }

  private notifyVideoAvailability(available: boolean, reason?: string): void {
    this.videoAvailabilityCallbacks.forEach((callback) => {
      callback(available, reason);
    });
  }

  /**
   * Stop the audio track completely (releases microphone hardware).
   */
  stopAudioTrack(reason: string = 'Microphone turned off'): void {
    const tracks = this.getAudioTracks();
    this.audioUnavailableReason = reason;

    if (tracks.length === 0) {
      this.updateDerivedState();
      this.notifyAudioAvailability(false, reason);
      return;
    }

    tracks.forEach((track) => {
      console.log('[Media] Stopping audio track:', track.id, 'Reason:', reason);
      track.stop();
      this.localStream?.removeTrack(track);
    });

    this.updateDerivedState();
    this.notifyAudioAvailability(false, reason);
  }

  /**
   * Start/re-acquire the audio track.
   * Uses the previously selected device ID if available.
   * Returns the new track, or null on failure.
   */
  async startAudioTrack(): Promise<MediaStreamTrack | null> {
    if (!this.localStream) {
      console.error('[Media] No active stream to add audio track');
      return null;
    }

    const existingTrack = this.getAudioTracks()[0];
    if (existingTrack) {
      existingTrack.enabled = true;
      this.audioUnavailableReason = null;
      this.updateDerivedState();
      this.notifyAudioAvailability(true);
      return existingTrack;
    }

    const constraints = this.buildAudioConstraints(this.selectedAudioDeviceId);

    let newStream: MediaStream;
    try {
      newStream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
    } catch (err) {
      console.error('[Media] Failed to re-acquire audio track:', err);
      this.audioUnavailableReason = err instanceof Error ? err.message : 'Failed to access microphone';
      this.notifyAudioAvailability(false, this.audioUnavailableReason);
      return null;
    }

    const newTrack = newStream.getAudioTracks()[0];
    if (!newTrack) {
      console.error('[Media] No audio track in new stream');
      newStream.getTracks().forEach((track) => {
        track.stop();
      });
      return null;
    }

    this.selectedAudioDeviceId = newTrack.getSettings().deviceId ?? null;
    this.localStream.addTrack(newTrack);
    this.audioUnavailableReason = null;
    this.updateDerivedState();
    this.notifyAudioAvailability(true);

    newStream.getVideoTracks().forEach((track) => {
      track.stop();
    });

    return newTrack;
  }

  /**
   * Check if audio track is currently available (not stopped).
   */
  hasAudioTrack(): boolean {
    return this.getAudioTracks().length > 0;
  }

  /**
   * Set the preferred audio device ID for re-acquisition.
   */
  setSelectedAudioDeviceId(deviceId: string | null): void {
    this.selectedAudioDeviceId = deviceId;
  }

  /**
   * Subscribe to audio availability changes.
   */
  onAudioAvailabilityChange(callback: AudioAvailabilityCallback): () => void {
    this.audioAvailabilityCallbacks.add(callback);
    return () => {
      this.audioAvailabilityCallbacks.delete(callback);
    };
  }

  private notifyAudioAvailability(available: boolean, reason?: string): void {
    this.audioAvailabilityCallbacks.forEach((callback) => {
      callback(available, reason);
    });
  }

  /**
   * Toggle audio with hardware control.
   * When disabled: stops the microphone track (releases hardware, indicator turns off).
   * When enabled: re-acquires the microphone track.
   * Returns true on success, false on failure.
   */
  async toggleAudio(enabled: boolean): Promise<boolean> {
    if (enabled) {
      if (this.hasAudioTrack()) {
        this.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
        this.audioUnavailableReason = null;
        this.updateDerivedState();
        this.notifyAudioAvailability(true);
        return true;
      }

      return (await this.startAudioTrack()) !== null;
    }

    if (!this.hasAudioTrack()) {
      this.audioUnavailableReason = 'Microphone turned off';
      this.notifyAudioAvailability(false, this.audioUnavailableReason);
      return true;
    }

    this.stopAudioTrack();
    return true;
  }

  isVideoEnabled(): boolean {
    const tracks = this.getVideoTracks();
    return tracks.length > 0 && tracks.every((track) => track.enabled);
  }

  isAudioEnabled(): boolean {
    const tracks = this.getAudioTracks();
    return tracks.length > 0 && tracks.every((track) => track.enabled);
  }

  /**
   * Check if currently running in audio-only mode.
   */
  isAudioOnly(): boolean {
    return this.isAudioOnlyMode;
  }

  /**
   * Get the reason why video is unavailable (if in audio-only mode).
   */
  getVideoUnavailableReason(): string | null {
    return this.videoUnavailableReason;
  }

  /**
   * Check available media devices and their permission states.
   */
  async checkPermissions(): Promise<MediaPermissionStatus> {
    let hasVideo = false;
    let hasAudio = false;
    let videoPermission: PermissionState | 'unknown' = 'unknown';
    let audioPermission: PermissionState | 'unknown' = 'unknown';

    // Try to use the Permissions API (not supported in all browsers)
    if (navigator.permissions) {
      try {
        const videoStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
        videoPermission = videoStatus.state;
      } catch {
        // Permissions API not supported for camera
      }

      try {
        const audioStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        audioPermission = audioStatus.state;
      } catch {
        // Permissions API not supported for microphone
      }
    }

    // Check for available devices
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      hasVideo = devices.some((d) => d.kind === 'videoinput');
      hasAudio = devices.some((d) => d.kind === 'audioinput');
    } catch {
      // enumerateDevices failed
    }

    return {
      hasVideo,
      hasAudio,
      videoPermission,
      audioPermission,
    };
  }

  private setStatus(status: MediaStatus): void {
    this.status = status;
    this.statusCallbacks.forEach((callback) => {
      callback(status);
    });
  }

  onStatusChange(callback: MediaStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    callback(this.status);
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  /**
   * Switch video input device (camera).
   * Returns the new track or null on failure.
   */
  async switchVideoDevice(deviceId: string): Promise<MediaStreamTrack | null> {
    const localStream = this.localStream;
    this.selectedVideoDeviceId = deviceId;

    if (!localStream || !this.hasVideoTrack()) {
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
      newStream.getTracks().forEach((track) => {
        track.stop();
      });
      return null;
    }

    localStream.getVideoTracks().forEach((track) => {
      track.stop();
    });

    localStream.getVideoTracks().forEach((track) => {
      localStream.removeTrack(track);
    });
    localStream.addTrack(newTrack);
    this.selectedVideoDeviceId = newTrack.getSettings().deviceId ?? deviceId;
    this.videoUnavailableReason = null;
    this.updateDerivedState();
    this.notifyVideoAvailability(true);

    newStream.getAudioTracks().forEach((track) => {
      track.stop();
    });

    return newTrack;
  }

  /**
   * Switch audio input device (microphone).
   * Returns the new track or null on failure.
   */
  async switchAudioDevice(deviceId: string): Promise<MediaStreamTrack | null> {
    const localStream = this.localStream;
    this.selectedAudioDeviceId = deviceId;

    if (!localStream || !this.hasAudioTrack()) {
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
      newStream.getTracks().forEach((track) => {
        track.stop();
      });
      return null;
    }

    localStream.getAudioTracks().forEach((track) => {
      track.stop();
    });

    localStream.getAudioTracks().forEach((track) => {
      localStream.removeTrack(track);
    });
    localStream.addTrack(newTrack);
    this.selectedAudioDeviceId = newTrack.getSettings().deviceId ?? deviceId;
    this.audioUnavailableReason = null;
    this.updateDerivedState();
    this.notifyAudioAvailability(true);

    newStream.getVideoTracks().forEach((track) => {
      track.stop();
    });

    return newTrack;
  }

  /**
   * Get the current video track's device ID.
   */
  getVideoDeviceId(): string | null {
    const track = this.localStream?.getVideoTracks()[0];
    return track?.getSettings().deviceId ?? this.selectedVideoDeviceId;
  }

  /**
   * Get the current audio track's device ID.
   */
  getAudioDeviceId(): string | null {
    const track = this.localStream?.getAudioTracks()[0];
    return track?.getSettings().deviceId ?? this.selectedAudioDeviceId;
  }

  private updateSelectedDeviceIdsFromStream(stream: MediaStream): void {
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      this.selectedVideoDeviceId = videoTrack.getSettings().deviceId ?? this.selectedVideoDeviceId;
    }

    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      this.selectedAudioDeviceId = audioTrack.getSettings().deviceId ?? this.selectedAudioDeviceId;
    }
  }

  private updateDerivedState(): void {
    const hasVideo = this.hasVideoTrack();
    const hasAudio = this.hasAudioTrack();
    this.isAudioOnlyMode = hasAudio && !hasVideo;
  }

  private notifyCurrentAvailability(): void {
    this.notifyVideoAvailability(
      this.hasVideoTrack(),
      this.hasVideoTrack() ? undefined : this.videoUnavailableReason ?? undefined,
    );
    this.notifyAudioAvailability(
      this.hasAudioTrack(),
      this.hasAudioTrack() ? undefined : this.audioUnavailableReason ?? undefined,
    );
  }

  private buildVideoConstraints(deviceId: string | null): MediaTrackConstraints {
    return deviceId
      ? {
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      : {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        };
  }

  private buildAudioConstraints(deviceId: string | null): MediaTrackConstraints {
    return deviceId
      ? { deviceId: { exact: deviceId } }
      : {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        };
  }
}

export const mediaManager = new MediaStreamManager();
