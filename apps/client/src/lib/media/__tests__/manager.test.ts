import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaStreamManager } from '../manager';

const mockGetUserMedia = vi.fn();
const mockEnumerateDevices = vi.fn();
const mockPermissionsQuery = vi.fn();
const mockTrackStop = vi.fn();

class MockMediaStream {
  private tracks: MediaStreamTrack[];

  constructor(tracks: MediaStreamTrack[] = []) {
    this.tracks = [...tracks];
  }

  addTrack(track: MediaStreamTrack): void {
    this.tracks.push(track);
  }

  removeTrack(track: MediaStreamTrack): void {
    this.tracks = this.tracks.filter((currentTrack) => currentTrack !== track);
  }

  getTracks(): MediaStreamTrack[] {
    return [...this.tracks];
  }

  getVideoTracks(): MediaStreamTrack[] {
    return this.tracks.filter((track) => track.kind === 'video');
  }

  getAudioTracks(): MediaStreamTrack[] {
    return this.tracks.filter((track) => track.kind === 'audio');
  }
}

vi.stubGlobal('MediaStream', MockMediaStream);
vi.stubGlobal('navigator', {
  mediaDevices: {
    getUserMedia: mockGetUserMedia,
    enumerateDevices: mockEnumerateDevices,
  },
  permissions: {
    query: mockPermissionsQuery,
  },
});

const createMockTrack = (id: string, kind: 'video' | 'audio', deviceId?: string) => ({
  id,
  kind,
  enabled: true,
  stop: mockTrackStop,
  getSettings: () => ({ deviceId: deviceId || `${kind}-device-${id}` }),
}) as unknown as MediaStreamTrack;

describe('MediaStreamManager', () => {
  let manager: MediaStreamManager;
  let initialVideoTrack: MediaStreamTrack;
  let initialAudioTrack: MediaStreamTrack;
  let initialStream: MediaStream;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new MediaStreamManager();
    initialVideoTrack = createMockTrack('video-track-1', 'video', 'video-device-1');
    initialAudioTrack = createMockTrack('audio-track-1', 'audio', 'audio-device-1');
    initialStream = new MockMediaStream([initialVideoTrack, initialAudioTrack]) as unknown as MediaStream;
    mockGetUserMedia.mockResolvedValue(initialStream);
  });

  afterEach(() => {
    manager.stopStream();
  });

  it('starts a stream with default constraints and exposes active tracks', async () => {
    const stream = await manager.startStream();

    expect(stream).toBe(initialStream);
    expect(mockGetUserMedia).toHaveBeenCalledWith({
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
    });
    expect(manager.getVideoTracks()).toEqual([initialVideoTrack]);
    expect(manager.getAudioTracks()).toEqual([initialAudioTrack]);
    expect(manager.getVideoDeviceId()).toBe('video-device-1');
    expect(manager.getAudioDeviceId()).toBe('audio-device-1');
  });

  it('reports status transitions through callbacks', async () => {
    const callback = vi.fn();
    manager.onStatusChange(callback);
    callback.mockClear();

    await manager.startStream();
    manager.stopStream();

    expect(callback).toHaveBeenNthCalledWith(1, 'starting');
    expect(callback).toHaveBeenNthCalledWith(2, 'active');
    expect(callback).toHaveBeenNthCalledWith(3, 'stopped');
  });

  it('supports joining with both camera and microphone disabled', async () => {
    const stream = await manager.startStream({ video: false, audio: false });

    expect(mockGetUserMedia).not.toHaveBeenCalled();
    expect(stream.getTracks()).toEqual([]);
    expect(manager.hasVideoTrack()).toBe(false);
    expect(manager.hasAudioTrack()).toBe(false);
  });

  it('respects preferred disabled video state on initial stream acquisition', async () => {
    manager.setPreferredVideoEnabled(false);

    await manager.startStream();

    expect(mockGetUserMedia).toHaveBeenCalledWith({
      video: false,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  });

  it('falls back to audio-only when camera permission is denied', async () => {
    const notAllowedError = new Error('Permission denied');
    notAllowedError.name = 'NotAllowedError';
    const audioOnlyTrack = createMockTrack('audio-track-only', 'audio', 'audio-device-1');
    const audioOnlyStream = new MockMediaStream([audioOnlyTrack]) as unknown as MediaStream;

    mockGetUserMedia
      .mockRejectedValueOnce(notAllowedError)
      .mockResolvedValueOnce(audioOnlyStream);

    await manager.startStream();
  });

  it('hard-stops and re-acquires the camera track', async () => {
    await manager.startStream();

    const videoAvailability = vi.fn();
    manager.onVideoAvailabilityChange(videoAvailability);
    videoAvailability.mockClear();

    await expect(manager.toggleVideo(false)).resolves.toBe(true);
    expect(manager.hasVideoTrack()).toBe(false);
    expect(manager.getVideoDeviceId()).toBe('video-device-1');
    expect(videoAvailability).toHaveBeenCalledWith(false, 'Camera turned off');

    const replacementVideoTrack = createMockTrack('video-track-2', 'video', 'video-device-2');
    const replacementVideoStream = new MockMediaStream([replacementVideoTrack]) as unknown as MediaStream;
    mockGetUserMedia.mockResolvedValueOnce(replacementVideoStream);

    await expect(manager.toggleVideo(true)).resolves.toBe(true);
    expect(manager.getVideoTracks()).toEqual([replacementVideoTrack]);
    expect(manager.getVideoDeviceId()).toBe('video-device-2');
  });

  it('hard-stops and re-acquires the microphone track', async () => {
    await manager.startStream();

    const audioAvailability = vi.fn();
    manager.onAudioAvailabilityChange(audioAvailability);
    audioAvailability.mockClear();

    await expect(manager.toggleAudio(false)).resolves.toBe(true);
    expect(manager.hasAudioTrack()).toBe(false);
    expect(manager.getAudioDeviceId()).toBe('audio-device-1');
    expect(audioAvailability).toHaveBeenCalledWith(false, 'Microphone turned off');

    const replacementAudioTrack = createMockTrack('audio-track-2', 'audio', 'audio-device-2');
    const replacementAudioStream = new MockMediaStream([replacementAudioTrack]) as unknown as MediaStream;
    mockGetUserMedia.mockResolvedValueOnce(replacementAudioStream);

    await expect(manager.toggleAudio(true)).resolves.toBe(true);
    expect(manager.getAudioTracks()).toEqual([replacementAudioTrack]);
    expect(manager.getAudioDeviceId()).toBe('audio-device-2');
  });

  it('notifies availability callbacks even when stopping an already disabled track', async () => {
    const videoAvailability = vi.fn();
    const audioAvailability = vi.fn();
    manager.onVideoAvailabilityChange(videoAvailability);
    manager.onAudioAvailabilityChange(audioAvailability);
    videoAvailability.mockClear();
    audioAvailability.mockClear();

    manager.stopVideoTrack('Camera turned off');
    manager.stopAudioTrack('Microphone turned off');

    expect(videoAvailability).toHaveBeenCalledWith(false, 'Camera turned off');
    expect(audioAvailability).toHaveBeenCalledWith(false, 'Microphone turned off');
  });

  it('keeps only the preferred device when switching while that kind is disabled', async () => {
    await manager.startStream();
    await manager.toggleVideo(false);
    await manager.toggleAudio(false);

    await expect(manager.switchVideoDevice('camera-2')).resolves.toBeNull();
    await expect(manager.switchAudioDevice('microphone-2')).resolves.toBeNull();

    expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
    expect(manager.getVideoDeviceId()).toBe('camera-2');
    expect(manager.getAudioDeviceId()).toBe('microphone-2');
  });

  it('switches active devices and updates the preferred device id', async () => {
    await manager.startStream();

    const replacementVideoTrack = createMockTrack('video-track-3', 'video', 'camera-3');
    const replacementVideoStream = new MockMediaStream([replacementVideoTrack]) as unknown as MediaStream;
    mockGetUserMedia.mockResolvedValueOnce(replacementVideoStream);

    const replacementAudioTrack = createMockTrack('audio-track-3', 'audio', 'microphone-3');
    const replacementAudioStream = new MockMediaStream([replacementAudioTrack]) as unknown as MediaStream;
    mockGetUserMedia.mockResolvedValueOnce(replacementAudioStream);

    await expect(manager.switchVideoDevice('camera-3')).resolves.toBe(replacementVideoTrack);
    await expect(manager.switchAudioDevice('microphone-3')).resolves.toBe(replacementAudioTrack);

    expect(manager.getVideoDeviceId()).toBe('camera-3');
    expect(manager.getAudioDeviceId()).toBe('microphone-3');
  });

  it('checks media permissions and available devices', async () => {
    mockPermissionsQuery
      .mockResolvedValueOnce({ state: 'granted' })
      .mockResolvedValueOnce({ state: 'prompt' });
    mockEnumerateDevices.mockResolvedValue([
      { kind: 'videoinput', deviceId: 'camera-1' },
      { kind: 'audioinput', deviceId: 'microphone-1' },
    ]);

    await expect(manager.checkPermissions()).resolves.toEqual({
      hasVideo: true,
      hasAudio: true,
      videoPermission: 'granted',
      audioPermission: 'prompt',
    });
  });
});
