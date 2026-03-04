import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MediaStreamManager } from '../manager';

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn();
const mockEnumerateDevices = vi.fn();
const mockPermissionsQuery = vi.fn();
const mockTrackStop = vi.fn();

const createMockTrack = (id: string, kind: 'video' | 'audio', deviceId?: string) => ({
  id,
  kind,
  enabled: true,
  stop: mockTrackStop,
  getSettings: () => ({ deviceId: deviceId || `${kind}-device-${id}` }),
});

const mockVideoTrack = createMockTrack('video-track-1', 'video', 'video-device-1') as unknown as MediaStreamTrack;
const mockAudioTrack = createMockTrack('audio-track-1', 'audio', 'audio-device-1') as unknown as MediaStreamTrack;

const mockStream = {
  id: 'stream-1',
  getVideoTracks: () => [mockVideoTrack],
  getAudioTracks: () => [mockAudioTrack],
  getTracks: () => [mockVideoTrack, mockAudioTrack],
  removeTrack: vi.fn(),
  addTrack: vi.fn(),
} as unknown as MediaStream;

vi.stubGlobal('navigator', {
  mediaDevices: {
    getUserMedia: mockGetUserMedia,
    enumerateDevices: mockEnumerateDevices,
  },
  permissions: {
    query: mockPermissionsQuery,
  },
});

describe('MediaStreamManager', () => {
  let manager: MediaStreamManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new MediaStreamManager();
    mockGetUserMedia.mockResolvedValue(mockStream);
    mockTrackStop.mockClear();
    // Reset track enabled state
    (mockVideoTrack as { enabled: boolean }).enabled = true;
    (mockAudioTrack as { enabled: boolean }).enabled = true;
  });

  afterEach(() => {
    manager.stopStream();
  });

  describe('initial state', () => {
    it('should have initial status as idle', () => {
      expect(manager.getStatus()).toBe('idle');
    });

    it('should return null stream initially', () => {
      expect(manager.getStream()).toBeNull();
    });

    it('should return empty video tracks initially', () => {
      expect(manager.getVideoTracks()).toEqual([]);
    });

    it('should return empty audio tracks initially', () => {
      expect(manager.getAudioTracks()).toEqual([]);
    });

    it('should have no error initially', () => {
      expect(manager.getError()).toBeNull();
    });

    it('should not have active stream initially', () => {
      expect(manager.hasActiveStream()).toBe(false);
    });
  });

  describe('startStream', () => {
    it('should call getUserMedia with default constraints', async () => {
      await manager.startStream();

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
    });

    it('should call getUserMedia with custom constraints', async () => {
      await manager.startStream({ video: false, audio: true });

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: false,
        audio: true,
      });
    });

    it('should set status to active on success', async () => {
      await manager.startStream();

      expect(manager.getStatus()).toBe('active');
    });

    it('should return the stream', async () => {
      const stream = await manager.startStream();

      expect(stream).toBe(mockStream);
    });

    it('should return existing stream if already started', async () => {
      const stream1 = await manager.startStream();
      const stream2 = await manager.startStream();

      expect(stream1).toBe(stream2);
      expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
    });

    it('should set status to error on failure', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));

      await expect(manager.startStream()).rejects.toThrow('Permission denied');

      expect(manager.getStatus()).toBe('error');
    });

    it('should store error on failure', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));

      await expect(manager.startStream()).rejects.toThrow();

      expect(manager.getError()).toBeInstanceOf(Error);
      expect(manager.getError()?.message).toBe('Permission denied');
    });

    it('should wrap non-Error failures', async () => {
      mockGetUserMedia.mockRejectedValue('Unknown error');

      await expect(manager.startStream()).rejects.toThrow('Unknown error');
    });

    it('should notify status callbacks on success', async () => {
      const callback = vi.fn();
      manager.onStatusChange(callback);
      callback.mockClear();

      await manager.startStream();

      expect(callback).toHaveBeenCalledWith('starting');
      expect(callback).toHaveBeenCalledWith('active');
    });

    it('should notify status callbacks on error', async () => {
      const callback = vi.fn();
      manager.onStatusChange(callback);
      callback.mockClear();
      mockGetUserMedia.mockRejectedValue(new Error('Failed'));

      await expect(manager.startStream()).rejects.toThrow();

      expect(callback).toHaveBeenCalledWith('starting');
      expect(callback).toHaveBeenCalledWith('error');
    });
  });

  describe('stopStream', () => {
    it('should stop all tracks', async () => {
      await manager.startStream();
      manager.stopStream();

      expect(mockTrackStop).toHaveBeenCalledTimes(2);
    });

    it('should set status to stopped', async () => {
      await manager.startStream();
      manager.stopStream();

      expect(manager.getStatus()).toBe('stopped');
    });

    it('should clear the stream', async () => {
      await manager.startStream();
      manager.stopStream();

      expect(manager.getStream()).toBeNull();
    });

    it('should not throw when no stream exists', () => {
      expect(() => manager.stopStream()).not.toThrow();
      expect(manager.getStatus()).toBe('stopped');
    });

    it('should notify status callbacks', async () => {
      const callback = vi.fn();
      manager.onStatusChange(callback);
      callback.mockClear();

      await manager.startStream();
      callback.mockClear();
      manager.stopStream();

      expect(callback).toHaveBeenCalledWith('stopped');
    });
  });

  describe('track getters', () => {
    it('should return video tracks after starting', async () => {
      await manager.startStream();

      expect(manager.getVideoTracks()).toEqual([mockVideoTrack]);
    });

    it('should return audio tracks after starting', async () => {
      await manager.startStream();

      expect(manager.getAudioTracks()).toEqual([mockAudioTrack]);
    });
  });

  describe('toggleVideo', () => {
    it('should enable video tracks when passed true', async () => {
      await manager.startStream();
      (mockVideoTrack as { enabled: boolean }).enabled = false;

      manager.toggleVideo(true);

      expect(mockVideoTrack.enabled).toBe(true);
    });

    it('should disable video tracks when passed false', async () => {
      await manager.startStream();

      manager.toggleVideo(false);

      expect(mockVideoTrack.enabled).toBe(false);
    });

    it('should not throw when no stream exists', () => {
      expect(() => manager.toggleVideo(true)).not.toThrow();
    });
  });

  describe('toggleAudio', () => {
    it('should enable audio tracks when passed true', async () => {
      await manager.startStream();
      (mockAudioTrack as { enabled: boolean }).enabled = false;

      manager.toggleAudio(true);

      expect(mockAudioTrack.enabled).toBe(true);
    });

    it('should disable audio tracks when passed false', async () => {
      await manager.startStream();

      manager.toggleAudio(false);

      expect(mockAudioTrack.enabled).toBe(false);
    });

    it('should not throw when no stream exists', () => {
      expect(() => manager.toggleAudio(true)).not.toThrow();
    });
  });

  describe('isVideoEnabled', () => {
    it('should return false when no stream exists', () => {
      expect(manager.isVideoEnabled()).toBe(false);
    });

    it('should return true when video track is enabled', async () => {
      await manager.startStream();

      expect(manager.isVideoEnabled()).toBe(true);
    });

    it('should return false when video track is disabled', async () => {
      await manager.startStream();
      manager.toggleVideo(false);

      expect(manager.isVideoEnabled()).toBe(false);
    });
  });

  describe('isAudioEnabled', () => {
    it('should return false when no stream exists', () => {
      expect(manager.isAudioEnabled()).toBe(false);
    });

    it('should return true when audio track is enabled', async () => {
      await manager.startStream();

      expect(manager.isAudioEnabled()).toBe(true);
    });

    it('should return false when audio track is disabled', async () => {
      await manager.startStream();
      manager.toggleAudio(false);

      expect(manager.isAudioEnabled()).toBe(false);
    });
  });

  describe('hasActiveStream', () => {
    it('should return true when stream is active', async () => {
      await manager.startStream();

      expect(manager.hasActiveStream()).toBe(true);
    });

    it('should return false after stopping', async () => {
      await manager.startStream();
      manager.stopStream();

      expect(manager.hasActiveStream()).toBe(false);
    });
  });

  describe('status callbacks', () => {
    it('should register and call status change callback with current status', () => {
      const callback = vi.fn();
      manager.onStatusChange(callback);

      expect(callback).toHaveBeenCalledWith('idle');
    });

    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = manager.onStatusChange(callback);
      callback.mockClear();

      unsubscribe();
      manager.stopStream();

      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple callbacks', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.onStatusChange(callback1);
      manager.onStatusChange(callback2);
      callback1.mockClear();
      callback2.mockClear();

      await manager.startStream();

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('device switching', () => {
    describe('switchVideoDevice', () => {
      it('should return null when no active stream exists', async () => {
        const result = await manager.switchVideoDevice('new-device-id');

        expect(result).toBeNull();
      });

      it('should call getUserMedia with exact deviceId', async () => {
        await manager.startStream();

        const newVideoTrack = createMockTrack('new-video', 'video', 'new-video-device');
        const newStream = {
          getVideoTracks: () => [newVideoTrack],
          getAudioTracks: () => [],
          getTracks: () => [newVideoTrack],
        };

        mockGetUserMedia.mockResolvedValueOnce(newStream);

        await manager.switchVideoDevice('new-video-device');

        expect(mockGetUserMedia).toHaveBeenCalledWith({
          video: { deviceId: { exact: 'new-video-device' } },
        });
      });

      it('should fallback to default device on exact deviceId failure', async () => {
        await manager.startStream();

        const newVideoTrack = createMockTrack('new-video', 'video', 'default-video');
        const newStream = {
          getVideoTracks: () => [newVideoTrack],
          getAudioTracks: () => [],
          getTracks: () => [newVideoTrack],
        };

        mockGetUserMedia
          .mockRejectedValueOnce(new Error('Device not found'))
          .mockResolvedValueOnce(newStream);

        const result = await manager.switchVideoDevice('invalid-device');

        expect(mockGetUserMedia).toHaveBeenLastCalledWith({ video: true });
        expect(result).toBe(newVideoTrack);
      });

      it('should return null when fallback also fails', async () => {
        await manager.startStream();

        mockGetUserMedia
          .mockRejectedValueOnce(new Error('Device not found'))
          .mockRejectedValueOnce(new Error('No video device'));

        const result = await manager.switchVideoDevice('invalid-device');

        expect(result).toBeNull();
      });

      it('should return null when new stream has no video track', async () => {
        await manager.startStream();

        const newStream = {
          getVideoTracks: () => [],
          getAudioTracks: () => [],
          getTracks: () => [],
        };

        mockGetUserMedia.mockResolvedValueOnce(newStream);

        const result = await manager.switchVideoDevice('some-device');

        expect(result).toBeNull();
      });

      it('should notify device switch callbacks', async () => {
        await manager.startStream();

        const newVideoTrack = createMockTrack('new-video', 'video', 'new-video-device');
        const newStream = {
          getVideoTracks: () => [newVideoTrack],
          getAudioTracks: () => [],
          getTracks: () => [newVideoTrack],
        };

        mockGetUserMedia.mockResolvedValueOnce(newStream);

        const callback = vi.fn();
        manager.onDeviceSwitch(callback);

        await manager.switchVideoDevice('new-video-device');

        expect(callback).toHaveBeenCalledWith('video', 'new-video-device');
      });
    });

    describe('switchAudioDevice', () => {
      it('should return null when no active stream exists', async () => {
        const result = await manager.switchAudioDevice('new-device-id');

        expect(result).toBeNull();
      });

      it('should call getUserMedia with exact deviceId', async () => {
        await manager.startStream();

        const newAudioTrack = createMockTrack('new-audio', 'audio', 'new-audio-device');
        const newStream = {
          getVideoTracks: () => [],
          getAudioTracks: () => [newAudioTrack],
          getTracks: () => [newAudioTrack],
        };

        mockGetUserMedia.mockResolvedValueOnce(newStream);

        await manager.switchAudioDevice('new-audio-device');

        expect(mockGetUserMedia).toHaveBeenCalledWith({
          audio: { deviceId: { exact: 'new-audio-device' } },
        });
      });

      it('should fallback to default device on exact deviceId failure', async () => {
        await manager.startStream();

        const newAudioTrack = createMockTrack('new-audio', 'audio', 'default-audio');
        const newStream = {
          getVideoTracks: () => [],
          getAudioTracks: () => [newAudioTrack],
          getTracks: () => [newAudioTrack],
        };

        mockGetUserMedia
          .mockRejectedValueOnce(new Error('Device not found'))
          .mockResolvedValueOnce(newStream);

        const result = await manager.switchAudioDevice('invalid-device');

        expect(mockGetUserMedia).toHaveBeenLastCalledWith({ audio: true });
        expect(result).toBe(newAudioTrack);
      });

      it('should notify device switch callbacks', async () => {
        await manager.startStream();

        const newAudioTrack = createMockTrack('new-audio', 'audio', 'new-audio-device');
        const newStream = {
          getVideoTracks: () => [],
          getAudioTracks: () => [newAudioTrack],
          getTracks: () => [newAudioTrack],
        };

        mockGetUserMedia.mockResolvedValueOnce(newStream);

        const callback = vi.fn();
        manager.onDeviceSwitch(callback);

        await manager.switchAudioDevice('new-audio-device');

        expect(callback).toHaveBeenCalledWith('audio', 'new-audio-device');
      });
    });

    describe('onDeviceSwitch', () => {
      it('should return unsubscribe function', async () => {
        await manager.startStream();

        const newVideoTrack = createMockTrack('new-video', 'video', 'new-device');
        const newStream = {
          getVideoTracks: () => [newVideoTrack],
          getAudioTracks: () => [],
          getTracks: () => [newVideoTrack],
        };

        mockGetUserMedia.mockResolvedValueOnce(newStream);

        const callback = vi.fn();
        const unsubscribe = manager.onDeviceSwitch(callback);
        unsubscribe();

        await manager.switchVideoDevice('new-device');

        expect(callback).not.toHaveBeenCalled();
      });
    });

    describe('getVideoDeviceId', () => {
      it('should return null when no stream exists', () => {
        expect(manager.getVideoDeviceId()).toBeNull();
      });

      it('should return device ID from video track settings', async () => {
        await manager.startStream();

        expect(manager.getVideoDeviceId()).toBe('video-device-1');
      });
    });

    describe('getAudioDeviceId', () => {
      it('should return null when no stream exists', () => {
        expect(manager.getAudioDeviceId()).toBeNull();
      });

      it('should return device ID from audio track settings', async () => {
        await manager.startStream();

        expect(manager.getAudioDeviceId()).toBe('audio-device-1');
      });
    });
  });

  describe('graceful degradation', () => {
    describe('startStreamWithFallback', () => {
      it('should return stream with isAudioOnly false on success', async () => {
        const result = await manager.startStreamWithFallback();

        expect(result.stream).toBe(mockStream);
        expect(result.isAudioOnly).toBe(false);
        expect(result.videoError).toBeUndefined();
      });

      it('should fallback to audio-only when video permission denied', async () => {
        const notAllowedError = new Error('Permission denied');
        notAllowedError.name = 'NotAllowedError';

        const audioOnlyStream = {
          id: 'audio-only-stream',
          getVideoTracks: () => [],
          getAudioTracks: () => [mockAudioTrack],
          getTracks: () => [mockAudioTrack],
        } as unknown as MediaStream;

        mockGetUserMedia
          .mockRejectedValueOnce(notAllowedError)
          .mockResolvedValueOnce(audioOnlyStream);

        const result = await manager.startStreamWithFallback();

        expect(result.stream).toBe(audioOnlyStream);
        expect(result.isAudioOnly).toBe(true);
        expect(result.videoError).toBe('Camera permission denied or unavailable');
      });

      it('should throw error when both video and audio fail', async () => {
        const notAllowedError = new Error('Permission denied');
        notAllowedError.name = 'NotAllowedError';

        mockGetUserMedia
          .mockRejectedValueOnce(notAllowedError)
          .mockRejectedValueOnce(new Error('Audio permission denied'));

        await expect(manager.startStreamWithFallback()).rejects.toThrow(
          'Camera and microphone permissions denied'
        );
      });

      it('should return existing stream if already started', async () => {
        const result1 = await manager.startStreamWithFallback();
        const result2 = await manager.startStreamWithFallback();

        expect(result1.stream).toBe(result2.stream);
        expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
      });
    });

    describe('isAudioOnly', () => {
      it('should return false initially', () => {
        expect(manager.isAudioOnly()).toBe(false);
      });

      it('should return true when in audio-only mode', async () => {
        const notAllowedError = new Error('Permission denied');
        notAllowedError.name = 'NotAllowedError';

        const audioOnlyStream = {
          id: 'audio-only-stream',
          getVideoTracks: () => [],
          getAudioTracks: () => [mockAudioTrack],
          getTracks: () => [mockAudioTrack],
        } as unknown as MediaStream;

        mockGetUserMedia
          .mockRejectedValueOnce(notAllowedError)
          .mockResolvedValueOnce(audioOnlyStream);

        await manager.startStreamWithFallback();

        expect(manager.isAudioOnly()).toBe(true);
      });

      it('should return false after stopStream', async () => {
        await manager.startStream();
        manager.stopStream();

        expect(manager.isAudioOnly()).toBe(false);
      });
    });

    describe('getVideoUnavailableReason', () => {
      it('should return null initially', () => {
        expect(manager.getVideoUnavailableReason()).toBeNull();
      });

      it('should return reason when in audio-only mode', async () => {
        const notAllowedError = new Error('Permission denied');
        notAllowedError.name = 'NotAllowedError';

        const audioOnlyStream = {
          id: 'audio-only-stream',
          getVideoTracks: () => [],
          getAudioTracks: () => [mockAudioTrack],
          getTracks: () => [mockAudioTrack],
        } as unknown as MediaStream;

        mockGetUserMedia
          .mockRejectedValueOnce(notAllowedError)
          .mockResolvedValueOnce(audioOnlyStream);

        await manager.startStreamWithFallback();

        expect(manager.getVideoUnavailableReason()).toBe(
          'Camera permission denied or unavailable'
        );
      });

      it('should return null after stopStream', async () => {
        await manager.startStream();
        manager.stopStream();

        expect(manager.getVideoUnavailableReason()).toBeNull();
      });
    });
  });

  describe('permission checking', () => {
    describe('checkPermissions', () => {
      it('should return permission status with devices', async () => {
        mockEnumerateDevices.mockResolvedValue([
          { kind: 'videoinput', deviceId: 'video-1' },
          { kind: 'audioinput', deviceId: 'audio-1' },
        ]);
        mockPermissionsQuery.mockResolvedValue({ state: 'granted' });

        const status = await manager.checkPermissions();

        expect(status.hasVideo).toBe(true);
        expect(status.hasAudio).toBe(true);
        expect(status.videoPermission).toBe('granted');
        expect(status.audioPermission).toBe('granted');
      });

      it('should return unknown when permissions API not supported', async () => {
        mockEnumerateDevices.mockResolvedValue([
          { kind: 'videoinput', deviceId: 'video-1' },
          { kind: 'audioinput', deviceId: 'audio-1' },
        ]);
        mockPermissionsQuery.mockRejectedValue(new Error('Not supported'));

        const status = await manager.checkPermissions();

        expect(status.hasVideo).toBe(true);
        expect(status.hasAudio).toBe(true);
        expect(status.videoPermission).toBe('unknown');
        expect(status.audioPermission).toBe('unknown');
      });

      it('should handle no devices available', async () => {
        mockEnumerateDevices.mockResolvedValue([]);
        mockPermissionsQuery.mockResolvedValue({ state: 'prompt' });

        const status = await manager.checkPermissions();

        expect(status.hasVideo).toBe(false);
        expect(status.hasAudio).toBe(false);
      });
    });
  });
});
