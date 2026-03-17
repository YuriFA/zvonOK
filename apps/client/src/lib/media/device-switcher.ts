/**
 * Device switcher.
 * Single responsibility: replace a live track with one from a different device.
 *
 * Extracted from MediaTrackController to satisfy SRP — the track controller
 * no longer needs to know how device switching works internally.
 */

import type { IMediaStateStore } from './interfaces';

/**
 * Handles switching active tracks to a different hardware device.
 */
export class DeviceSwitcher {
  private stateStore: IMediaStateStore;

  constructor(stateStore: IMediaStateStore) {
    this.stateStore = stateStore;
  }

  /**
   * Replace the active video track with one from a different device.
   *
   * @param stream          The current MediaStream
   * @param deviceId        Target device ID
   * @param hasLiveTrack    Whether a live video track currently exists
   * @param onTrackAttached Callback to attach an `ended` listener on the new track
   * @returns The new track, or null if the stream has no live video track.
   */
  async switchVideo(
    stream: MediaStream,
    deviceId: string,
    hasLiveTrack: boolean,
    onTrackAttached: (track: MediaStreamTrack, stream: MediaStream) => void,
  ): Promise<MediaStreamTrack | null> {
    if (!hasLiveTrack) {
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

    // Remove old tracks
    stream.getVideoTracks().forEach((track) => {
      track.stop();
      stream.removeTrack(track);
    });

    stream.addTrack(newTrack);
    onTrackAttached(newTrack, stream);
    this.stateStore.notifyVideoAvailability(true);

    // Stop any audio tracks from the new stream (getUserMedia may return both)
    newStream.getAudioTracks().forEach((track) => track.stop());

    return newTrack;
  }

  /**
   * Replace the active audio track with one from a different device.
   *
   * @param stream          The current MediaStream
   * @param deviceId        Target device ID
   * @param hasLiveTrack    Whether a live audio track currently exists
   * @param onTrackAttached Callback to attach an `ended` listener on the new track
   * @returns The new track, or null if the stream has no live audio track.
   */
  async switchAudio(
    stream: MediaStream,
    deviceId: string,
    hasLiveTrack: boolean,
    onTrackAttached: (track: MediaStreamTrack, stream: MediaStream) => void,
  ): Promise<MediaStreamTrack | null> {
    if (!hasLiveTrack) {
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

    // Remove old tracks
    stream.getAudioTracks().forEach((track) => {
      track.stop();
      stream.removeTrack(track);
    });

    stream.addTrack(newTrack);
    onTrackAttached(newTrack, stream);
    this.stateStore.notifyAudioAvailability(true);

    // Stop any video tracks from the new stream
    newStream.getVideoTracks().forEach((track) => track.stop());

    return newTrack;
  }

  // Constraint builders (same logic as the former track-controller private methods)
  private buildVideoConstraints(deviceId: string): MediaTrackConstraints {
    return {
      deviceId: { exact: deviceId },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    };
  }

  private buildAudioConstraints(deviceId: string): MediaTrackConstraints {
    return { deviceId: { exact: deviceId } };
  }
}
