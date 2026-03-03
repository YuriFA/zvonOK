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

export class MediaStreamManager {
  private localStream: MediaStream | null = null;
  private status: MediaStatus = 'idle';
  private statusCallbacks: Set<MediaStatusCallback> = new Set();
  private error: Error | null = null;

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
}

export const mediaManager = new MediaStreamManager();
