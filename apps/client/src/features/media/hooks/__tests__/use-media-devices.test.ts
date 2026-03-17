import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetUserMedia = vi.hoisted(() => vi.fn());
const mockEnumerateDevices = vi.hoisted(() => vi.fn());
const mockAddEventListener = vi.hoisted(() => vi.fn());
const mockRemoveEventListener = vi.hoisted(() => vi.fn());

vi.stubGlobal('navigator', {
  mediaDevices: {
    getUserMedia: mockGetUserMedia,
    enumerateDevices: mockEnumerateDevices,
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
  },
});

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

import { useMediaDevices } from '../use-media-devices';

const createMockTrack = (id: string) =>
  ({
    id,
    stop: vi.fn(),
  }) as unknown as MediaStreamTrack;

const createMockStream = (tracks: MediaStreamTrack[] = []) =>
  ({
    getTracks: () => tracks,
  }) as unknown as MediaStream;

const createMockDeviceInfo = (
  deviceId: string,
  kind: 'videoinput' | 'audioinput' | 'audiooutput',
  label?: string
) =>
  ({
    deviceId,
    kind,
    label: label || `${kind} ${deviceId}`,
    groupId: `group-${deviceId}`,
  }) as MediaDeviceInfo;

describe('useMediaDevices', () => {
  let deviceChangeCallback: (() => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    deviceChangeCallback = null;

    mockAddEventListener.mockImplementation((_event: string, cb: () => void) => {
      deviceChangeCallback = cb;
    });
    mockRemoveEventListener.mockImplementation(() => {
      deviceChangeCallback = null;
    });

    const mockTrack = createMockTrack('perm-track');
    mockGetUserMedia.mockResolvedValue(createMockStream([mockTrack]));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('starts in loading state', async () => {
      mockEnumerateDevices.mockResolvedValue([]);

      const { result } = renderHook(() => useMediaDevices());

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('requests permissions on first load', async () => {
      mockEnumerateDevices.mockResolvedValue([]);

      renderHook(() => useMediaDevices());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockGetUserMedia).toHaveBeenCalledWith({ video: true, audio: true });
    });

    it('does not request permissions again after granted', async () => {
      mockEnumerateDevices.mockResolvedValue([]);

      const { rerender } = renderHook(() => useMediaDevices());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      mockGetUserMedia.mockClear();

      rerender();

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockGetUserMedia).not.toHaveBeenCalled();
    });
  });

  describe('device enumeration', () => {
    it('separates devices by kind', async () => {
      const devices = [
        createMockDeviceInfo('cam-1', 'videoinput', 'Camera 1'),
        createMockDeviceInfo('cam-2', 'videoinput', 'Camera 2'),
        createMockDeviceInfo('mic-1', 'audioinput', 'Microphone 1'),
        createMockDeviceInfo('mic-2', 'audioinput', 'Microphone 2'),
        createMockDeviceInfo('speaker-1', 'audiooutput', 'Speaker 1'),
      ];

      mockEnumerateDevices.mockResolvedValue(devices);

      const { result } = renderHook(() => useMediaDevices());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.videoDevices).toHaveLength(2);
      expect(result.current.audioDevices).toHaveLength(2);
      expect(result.current.speakerDevices).toHaveLength(1);

      expect(result.current.videoDevices[0].deviceId).toBe('cam-1');
      expect(result.current.audioDevices[0].deviceId).toBe('mic-1');
      expect(result.current.speakerDevices[0].deviceId).toBe('speaker-1');
    });

    it('handles devices without labels', async () => {
      const devices = [
        { ...createMockDeviceInfo('cam-1', 'videoinput'), label: '' },
        { ...createMockDeviceInfo('mic-1', 'audioinput'), label: '' },
      ];

      mockEnumerateDevices.mockResolvedValue(devices);

      const { result } = renderHook(() => useMediaDevices());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.videoDevices[0].label).toBe('Unknown videoinput');
      expect(result.current.audioDevices[0].label).toBe('Unknown audioinput');
    });

    it('sets loading to false after enumeration', async () => {
      mockEnumerateDevices.mockResolvedValue([]);

      const { result } = renderHook(() => useMediaDevices());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('sets loading to false even when enumeration fails', async () => {
      mockEnumerateDevices.mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() => useMediaDevices());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('device selection', () => {
    it('loads selected devices from localStorage', async () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({
          videoDeviceId: 'saved-cam',
          audioDeviceId: 'saved-mic',
          speakerDeviceId: 'saved-speaker',
        })
      );

      mockEnumerateDevices.mockResolvedValue([]);

      const { result } = renderHook(() => useMediaDevices());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.selectedDevices).toEqual({
        videoDeviceId: 'saved-cam',
        audioDeviceId: 'saved-mic',
        speakerDeviceId: 'saved-speaker',
      });
    });

    it('uses null defaults when localStorage is empty', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      mockEnumerateDevices.mockResolvedValue([]);

      const { result } = renderHook(() => useMediaDevices());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.selectedDevices).toEqual({
        videoDeviceId: null,
        audioDeviceId: null,
        speakerDeviceId: null,
      });
    });

    it('handles corrupted localStorage data', async () => {
      localStorageMock.getItem.mockReturnValue('not valid json');
      mockEnumerateDevices.mockResolvedValue([]);

      const { result } = renderHook(() => useMediaDevices());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.selectedDevices).toEqual({
        videoDeviceId: null,
        audioDeviceId: null,
        speakerDeviceId: null,
      });
    });
  });

  describe('setSelectedVideoDevice', () => {
    it('updates selected video device', async () => {
      mockEnumerateDevices.mockResolvedValue([]);

      const { result } = renderHook(() => useMediaDevices());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.setSelectedVideoDevice('new-cam');
      });

      expect(result.current.selectedDevices.videoDeviceId).toBe('new-cam');
    });

    it('persists to localStorage', async () => {
      mockEnumerateDevices.mockResolvedValue([]);

      const { result } = renderHook(() => useMediaDevices());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.setSelectedVideoDevice('new-cam');
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('can set to null', async () => {
      mockEnumerateDevices.mockResolvedValue([]);

      const { result } = renderHook(() => useMediaDevices());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.setSelectedVideoDevice('cam-1');
      });

      act(() => {
        result.current.setSelectedVideoDevice(null);
      });

      expect(result.current.selectedDevices.videoDeviceId).toBeNull();
    });
  });

  describe('setSelectedAudioDevice', () => {
    it('updates selected audio device', async () => {
      mockEnumerateDevices.mockResolvedValue([]);

      const { result } = renderHook(() => useMediaDevices());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.setSelectedAudioDevice('new-mic');
      });

      expect(result.current.selectedDevices.audioDeviceId).toBe('new-mic');
    });

    it('can set to null', async () => {
      mockEnumerateDevices.mockResolvedValue([]);

      const { result } = renderHook(() => useMediaDevices());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.setSelectedAudioDevice(null);
      });

      expect(result.current.selectedDevices.audioDeviceId).toBeNull();
    });
  });

  describe('setSelectedSpeakerDevice', () => {
    it('updates selected speaker device', async () => {
      mockEnumerateDevices.mockResolvedValue([]);

      const { result } = renderHook(() => useMediaDevices());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.setSelectedSpeakerDevice('new-speaker');
      });

      expect(result.current.selectedDevices.speakerDeviceId).toBe('new-speaker');
    });

    it('can set to null', async () => {
      mockEnumerateDevices.mockResolvedValue([]);

      const { result } = renderHook(() => useMediaDevices());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.setSelectedSpeakerDevice(null);
      });

      expect(result.current.selectedDevices.speakerDeviceId).toBeNull();
    });
  });

  describe('devicechange event', () => {
    it('listens for devicechange events', async () => {
      mockEnumerateDevices.mockResolvedValue([]);

      renderHook(() => useMediaDevices());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockAddEventListener).toHaveBeenCalledWith('devicechange', expect.any(Function));
    });

    it('re-enumerates devices on devicechange', async () => {
      const initialDevices = [createMockDeviceInfo('cam-1', 'videoinput')];
      const updatedDevices = [
        createMockDeviceInfo('cam-1', 'videoinput'),
        createMockDeviceInfo('cam-2', 'videoinput'),
      ];

      mockEnumerateDevices.mockResolvedValueOnce(initialDevices);

      const { result } = renderHook(() => useMediaDevices());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.videoDevices).toHaveLength(1);

      mockEnumerateDevices.mockResolvedValueOnce(updatedDevices);

      await act(async () => {
        deviceChangeCallback?.();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.videoDevices).toHaveLength(2);
    });

    it('removes event listener on unmount', async () => {
      mockEnumerateDevices.mockResolvedValue([]);

      const { unmount } = renderHook(() => useMediaDevices());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith('devicechange', expect.any(Function));
    });
  });

  describe('error handling', () => {
    it('handles getUserMedia permission denial gracefully', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));
      mockEnumerateDevices.mockResolvedValue([]);

      const { result } = renderHook(() => useMediaDevices());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('handles enumerateDevices failure gracefully', async () => {
      mockGetUserMedia.mockResolvedValue(createMockStream([createMockTrack('t')]));
      mockEnumerateDevices.mockRejectedValue(new Error('Enumeration failed'));

      const { result } = renderHook(() => useMediaDevices());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.videoDevices).toEqual([]);
      expect(result.current.audioDevices).toEqual([]);
      expect(result.current.speakerDevices).toEqual([]);
    });

    it('handles localStorage write failure gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Quota exceeded');
      });
      mockEnumerateDevices.mockResolvedValue([]);

      const { result } = renderHook(() => useMediaDevices());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.setSelectedVideoDevice('cam-1');
      });

      expect(result.current.selectedDevices.videoDeviceId).toBe('cam-1');
    });
  });
});
