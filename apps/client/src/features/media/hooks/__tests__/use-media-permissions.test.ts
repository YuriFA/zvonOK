import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockStartStream = vi.hoisted(() => vi.fn());
const mockStopStream = vi.hoisted(() => vi.fn());

vi.mock('@/lib/media/manager', () => ({
  mediaManager: {
    startStream: mockStartStream,
    stopStream: mockStopStream,
  },
}));

import { useMediaPermissions } from '../use-media-permissions';

describe('useMediaPermissions', () => {
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
      const { result } = renderHook(() => useMediaPermissions());

      expect(result.current.isLoading).toBe(false);
    });

    it('should have null stream initially', () => {
      const { result } = renderHook(() => useMediaPermissions())

      expect(result.current.stream).toBeNull();
    });

    it('should have null error initially', () => {
      const { result } = renderHook(() => useMediaPermissions())

      expect(result.current.error).toBeNull();
    });
  });

  describe('startMedia', () => {
    it('should call mediaManager.startStream', async () => {
      const { result } = renderHook(() => useMediaPermissions())

      await act(async () => {
        await result.current.startMedia();
      });

      expect(mockStartStream).toHaveBeenCalled();
    });

    it('should update stream on success', async () => {
      mockStartStream.mockResolvedValue(mockStream);

      const { result } = renderHook(() => useMediaPermissions())

      await act(async () => {
        await result.current.startMedia();
      });

      expect(result.current.stream).toBe(mockStream);
    });
  });

  describe('stopMedia', () => {
    it('should call mediaManager.stopStream', async () => {
      mockStartStream.mockResolvedValue(mockStream)

      const { result } = renderHook(() => useMediaPermissions())

      await act(async () => {
        await result.current.startMedia();
      });

      expect(result.current.stream).toBe(mockStream);

      await act(async () => {
        result.current.stopMedia();
      });

      expect(mockStopStream).toHaveBeenCalled();
    });

    it('should clear stream', async () => {
      mockStartStream.mockResolvedValue(mockStream)

      const { result } = renderHook(() => useMediaPermissions())

      await act(async () => {
        await result.current.startMedia();
      });

      expect(result.current.stream).toBe(mockStream)

      await act(async () => {
        result.current.stopMedia();
      })

      expect(result.current.stream).toBeNull();
    });
  });
});
