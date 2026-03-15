import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockStartStream = vi.hoisted(() => vi.fn());
const mockStopStream = vi.hoisted(() => vi.fn());
const mockSetSelectedVideoDeviceId = vi.hoisted(() => vi.fn());
const mockSetSelectedAudioDeviceId = vi.hoisted(() => vi.fn());

vi.mock('@/lib/media/manager', () => ({
  mediaManager: {
    startStream: mockStartStream,
    stopStream: mockStopStream,
    setSelectedVideoDeviceId: mockSetSelectedVideoDeviceId,
    setSelectedAudioDeviceId: mockSetSelectedAudioDeviceId,
  },
}));

import { useMediaStream } from '../use-media-stream';

describe('useMediaStream', () => {
  const mockStream = {
    id: 'test-stream',
    getTracks: () => [],
  } as unknown as MediaStream;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStartStream.mockResolvedValue(mockStream);
  });

  describe('initial state', () => {
    it('should not be loading initially', () => {
      const { result } = renderHook(() => useMediaStream());

      expect(result.current.isLoading).toBe(false);
    });

    it('should have null stream initially', () => {
      const { result } = renderHook(() => useMediaStream());

      expect(result.current.stream).toBeNull();
    });

    it('should have null error initially', () => {
      const { result } = renderHook(() => useMediaStream());

      expect(result.current.error).toBeNull();
    });

    it('should not be initialized initially', () => {
      const { result } = renderHook(() => useMediaStream());

      expect(result.current.isInitialized).toBe(false);
    });
  });

  describe('manual start', () => {
    it('should call mediaManager.startStream', async () => {
      const { result } = renderHook(() => useMediaStream());

      await act(async () => {
        await result.current.start();
      });

      expect(mockStartStream).toHaveBeenCalled();
    });

    it('should update stream on success', async () => {
      mockStartStream.mockResolvedValue(mockStream);

      const { result } = renderHook(() => useMediaStream());

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.stream).toBe(mockStream);
    });

    it('should set isInitialized on success', async () => {
      mockStartStream.mockResolvedValue(mockStream);

      const { result } = renderHook(() => useMediaStream());

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.isInitialized).toBe(true);
    });

    it('should set error on failure', async () => {
      mockStartStream.mockRejectedValue(new Error('Permission denied'));

      const { result } = renderHook(() => useMediaStream());

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.error).toBe('Permission denied');
    });

    it('should set device IDs when provided', async () => {
      const { result } = renderHook(() =>
        useMediaStream({
          deviceId: { video: 'video-123', audio: 'audio-456' },
        })
      );

      await act(async () => {
        await result.current.start();
      });

      expect(mockSetSelectedVideoDeviceId).toHaveBeenCalledWith('video-123');
      expect(mockSetSelectedAudioDeviceId).toHaveBeenCalledWith('audio-456');
    });
  });

  describe('manual stop', () => {
    it('should call mediaManager.stopStream', async () => {
      mockStartStream.mockResolvedValue(mockStream);

      const { result } = renderHook(() => useMediaStream());

      await act(async () => {
        await result.current.start();
      });

      act(() => {
        result.current.stop();
      });

      expect(mockStopStream).toHaveBeenCalled();
    });

    it('should clear stream', async () => {
      mockStartStream.mockResolvedValue(mockStream);

      const { result } = renderHook(() => useMediaStream());

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.stream).toBe(mockStream);

      act(() => {
        result.current.stop();
      });

      expect(result.current.stream).toBeNull();
    });

    it('should reset isInitialized', async () => {
      mockStartStream.mockResolvedValue(mockStream);

      const { result } = renderHook(() => useMediaStream());

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.isInitialized).toBe(true);

      act(() => {
        result.current.stop();
      });

      expect(result.current.isInitialized).toBe(false);
    });
  });

  describe('enabled option', () => {
    it('should auto-start when enabled is true', async () => {
      mockStartStream.mockResolvedValue(mockStream);

      renderHook(() => useMediaStream({ enabled: true }));

      await vi.waitFor(() => {
        expect(mockStartStream).toHaveBeenCalled();
      });
    });

    it('should not auto-start when enabled is false', () => {
      renderHook(() => useMediaStream({ enabled: false }));

      expect(mockStartStream).not.toHaveBeenCalled();
    });

    it('should stop stream on unmount', async () => {
      mockStartStream.mockResolvedValue(mockStream);

      const { unmount } = renderHook(() => useMediaStream({ enabled: true }));

      await vi.waitFor(() => {
        expect(mockStartStream).toHaveBeenCalled();
      });

      unmount();

      expect(mockStopStream).toHaveBeenCalled();
    });
  });
});
