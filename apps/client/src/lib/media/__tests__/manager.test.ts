import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MediaStreamManager } from '../manager';

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn();
const mockTrackStop = vi.fn();
const mockVideoTrack = {
  id: 'video-track-1',
  kind: 'video',
  enabled: true,
  stop: mockTrackStop,
} as unknown as MediaStreamTrack;

const mockAudioTrack = {
  id: 'audio-track-1',
  kind: 'audio',
  enabled: true,
  stop: mockTrackStop,
} as unknown as MediaStreamTrack;

const mockStream = {
  id: 'stream-1',
  getVideoTracks: () => [mockVideoTrack],
  getAudioTracks: () => [mockAudioTrack],
  getTracks: () => [mockVideoTrack, mockAudioTrack],
} as unknown as MediaStream;

vi.stubGlobal('navigator', {
  mediaDevices: {
    getUserMedia: mockGetUserMedia,
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

      await expect(manager.startStream()).rejects.toThrow('Failed to get media stream');
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
});
