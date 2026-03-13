import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock the mediaManager module before importing the hook
const mockCheckPermissions = vi.hoisted(() => vi.fn());
const mockStartStreamWithFallback = vi.hoisted(() => vi.fn());
const mockStopStream = vi.hoisted(() => vi.fn());
const mockGetStream = vi.hoisted(() => vi.fn());
const mockIsAudioOnly = vi.hoisted(() => vi.fn());
const mockGetVideoUnavailableReason = vi.hoisted(() => vi.fn());

vi.mock('@/lib/media/manager', () => ({
  mediaManager: {
    checkPermissions: mockCheckPermissions,
    startStreamWithFallback: mockStartStreamWithFallback,
    stopStream: mockStopStream,
    getStream: mockGetStream,
    isAudioOnly: mockIsAudioOnly,
    getVideoUnavailableReason: mockGetVideoUnavailableReason,
  },
}));

import { useMediaPermissions } from '../use-media-permissions';

describe('useMediaPermissions', () => {
  const mockStream = {
    id: 'test-stream',
    getTracks: () => [],
  } as unknown as MediaStream;

  const defaultPermissionStatus = {
    hasVideo: true,
    hasAudio: true,
    videoPermission: 'granted' as const,
    audioPermission: 'granted' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckPermissions.mockResolvedValue(defaultPermissionStatus);
    mockStartStreamWithFallback.mockResolvedValue({
      stream: mockStream,
      isAudioOnly: false,
    });
    mockGetStream.mockReturnValue(mockStream);
    mockIsAudioOnly.mockReturnValue(false);
    mockGetVideoUnavailableReason.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have null permission status initially', async () => {
      const { result } = renderHook(() => useMediaPermissions());

      expect(result.current.permissionStatus).toBeNull();

      // Flush the auto-check effect to avoid act warnings.
      await waitFor(() => expect(mockCheckPermissions).toHaveBeenCalled());
    });

    it('should not be loading initially', async () => {
      const { result } = renderHook(() => useMediaPermissions());

      expect(result.current.isLoading).toBe(false);

      await waitFor(() => expect(mockCheckPermissions).toHaveBeenCalled());
    });

    it('should have null stream initially', async () => {
      const { result } = renderHook(() => useMediaPermissions());

      expect(result.current.stream).toBeNull();

      await waitFor(() => expect(mockCheckPermissions).toHaveBeenCalled());
    });

    it('should have null error initially', async () => {
      const { result } = renderHook(() => useMediaPermissions());

      expect(result.current.error).toBeNull();

      await waitFor(() => expect(mockCheckPermissions).toHaveBeenCalled());
    });

    it('should not be in audio-only mode initially', async () => {
      const { result } = renderHook(() => useMediaPermissions());

      expect(result.current.isAudioOnly).toBe(false);

      await waitFor(() => expect(mockCheckPermissions).toHaveBeenCalled());
    });

    it('should have null video unavailable reason initially', async () => {
      const { result } = renderHook(() => useMediaPermissions());

      expect(result.current.videoUnavailableReason).toBeNull();

      await waitFor(() => expect(mockCheckPermissions).toHaveBeenCalled());
    });
  });

  describe('checkPermissions', () => {
    it('should call mediaManager.checkPermissions', async () => {
      const { result } = renderHook(() => useMediaPermissions());

      await act(async () => {
        await result.current.checkPermissions();
      });

      expect(mockCheckPermissions).toHaveBeenCalled();
    });

    it('should update permissionStatus on success', async () => {
      const mockStatus = {
        hasVideo: true,
        hasAudio: true,
        videoPermission: 'granted' as const,
        audioPermission: 'granted' as const,
      };
      mockCheckPermissions.mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useMediaPermissions());

      await act(async () => {
        await result.current.checkPermissions();
      });

      expect(result.current.permissionStatus).toEqual(mockStatus);
    });
  });

  describe('startMedia', () => {
    it('should call mediaManager.startStreamWithFallback', async () => {
      const { result } = renderHook(() => useMediaPermissions());

      await act(async () => {
        await result.current.startMedia();
      });

      expect(mockStartStreamWithFallback).toHaveBeenCalled();
    });

    it('should update stream on success', async () => {
      const { result } = renderHook(() => useMediaPermissions());

      await act(async () => {
        await result.current.startMedia();
      });

      expect(result.current.stream).toBe(mockStream);
    });

    it('should update isAudioOnly on success', async () => {
      mockStartStreamWithFallback.mockResolvedValue({
        stream: mockStream,
        isAudioOnly: true,
        videoError: 'Camera unavailable',
      });
      mockIsAudioOnly.mockReturnValue(true);
      mockGetVideoUnavailableReason.mockReturnValue('Camera unavailable');

      const { result } = renderHook(() => useMediaPermissions());

      await act(async () => {
        await result.current.startMedia();
      });

      expect(result.current.isAudioOnly).toBe(true);
      expect(result.current.videoUnavailableReason).toBe('Camera unavailable');
    });
  });

  describe('stopMedia', () => {
    it('should call mediaManager.stopStream', async () => {
      const { result } = renderHook(() => useMediaPermissions());

      // Let mount effect finish to avoid act warnings.
      await waitFor(() => expect(mockCheckPermissions).toHaveBeenCalled());

      act(() => {
        result.current.stopMedia();
      });

      expect(mockStopStream).toHaveBeenCalled();
    });

    it('should clear stream', async () => {
      const { result } = renderHook(() => useMediaPermissions());

      // Start media first
      await act(async () => {
        await result.current.startMedia();
      });

      expect(result.current.stream).toBe(mockStream);

      // Stop media
      act(() => {
        result.current.stopMedia();
      });

      expect(result.current.stream).toBeNull();
    });
  });

  describe('retry', () => {
    it('should call startMedia multiple times until success', async () => {
      const { result } = renderHook(() => useMediaPermissions());

      // First two calls fail, third succeeds
      mockStartStreamWithFallback
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce({ stream: mockStream, isAudioOnly: false });

      const retryResult = await act(async () => {
        return result.current.retry(3);
      });

      expect(retryResult).not.toBeNull();
      expect(retryResult?.stream).toBe(mockStream);
      expect(mockStartStreamWithFallback).toHaveBeenCalledTimes(3);
    });

    it('should return null after max retries', async () => {
      mockStartStreamWithFallback.mockRejectedValue(new Error('Always fails'));

      const { result } = renderHook(() => useMediaPermissions());

      const retryResult = await act(async () => {
        return result.current.retry(3);
      });

      expect(retryResult).toBeNull();
      expect(mockStartStreamWithFallback).toHaveBeenCalledTimes(3);
    });

    it('should not retry on NotAllowedError', async () => {
      const notAllowedError = new Error('Permission denied');
      notAllowedError.name = 'NotAllowedError';
      mockStartStreamWithFallback.mockRejectedValue(notAllowedError);

      const { result } = renderHook(() => useMediaPermissions());

      const retryResult = await act(async () => {
        return result.current.retry(3);
      });

      expect(retryResult).toBeNull();
      // Should only try once (no retries on permission denied)
      expect(mockStartStreamWithFallback).toHaveBeenCalledTimes(1);
    });

    it('should use default max retries of 3', async () => {
      mockStartStreamWithFallback.mockRejectedValue(new Error('Always fails'));

      const { result } = renderHook(() => useMediaPermissions());

      await act(async () => {
        await result.current.retry();
      });

      expect(mockStartStreamWithFallback).toHaveBeenCalledTimes(3);
    });
  });

  describe('auto-check permissions on mount', () => {
    it('should check permissions on mount', async () => {
      renderHook(() => useMediaPermissions());

      await waitFor(() => expect(mockCheckPermissions).toHaveBeenCalled());
    });
  });
});
