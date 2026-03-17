import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetStream = vi.hoisted(() => vi.fn());
const mockGetStatus = vi.hoisted(() => vi.fn());
const mockStartStream = vi.hoisted(() => vi.fn());
const mockStopStream = vi.hoisted(() => vi.fn());
const mockStartVideoTrack = vi.hoisted(() => vi.fn());
const mockStopVideoTrack = vi.hoisted(() => vi.fn());
const mockStartAudioTrack = vi.hoisted(() => vi.fn());
const mockStopAudioTrack = vi.hoisted(() => vi.fn());
const mockSwitchVideoDevice = vi.hoisted(() => vi.fn());
const mockSwitchAudioDevice = vi.hoisted(() => vi.fn());
const mockGetVideoDeviceId = vi.hoisted(() => vi.fn());
const mockGetAudioDeviceId = vi.hoisted(() => vi.fn());
const mockSetPreferredVideoEnabled = vi.hoisted(() => vi.fn());
const mockSetPreferredAudioEnabled = vi.hoisted(() => vi.fn());
const mockOnStatusChange = vi.hoisted(() => vi.fn());

vi.mock('@/features/media/contexts/media-manager.context', () => ({
  useMediaManager: () => ({
    getStream: mockGetStream,
    getStatus: mockGetStatus,
    startStream: mockStartStream,
    stopStream: mockStopStream,
    startVideoTrack: mockStartVideoTrack,
    stopVideoTrack: mockStopVideoTrack,
    startAudioTrack: mockStartAudioTrack,
    stopAudioTrack: mockStopAudioTrack,
    switchVideoDevice: mockSwitchVideoDevice,
    switchAudioDevice: mockSwitchAudioDevice,
    getVideoDeviceId: mockGetVideoDeviceId,
    getAudioDeviceId: mockGetAudioDeviceId,
    setPreferredVideoEnabled: mockSetPreferredVideoEnabled,
    setPreferredAudioEnabled: mockSetPreferredAudioEnabled,
    onStatusChange: mockOnStatusChange,
  }),
}));

import { useLocalMedia } from '../use-local-media';

const createMockStream = (tracks: MediaStreamTrack[] = []) =>
  ({ getTracks: () => tracks }) as unknown as MediaStream;

const createMockTrack = (id: string, kind: 'video' | 'audio') =>
  ({ id, kind, enabled: true }) as unknown as MediaStreamTrack;

describe('useLocalMedia', () => {
  let statusCallback: ((status: string) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    statusCallback = null;

    mockGetStream.mockReturnValue(null);
    mockGetStatus.mockReturnValue('idle');
    mockOnStatusChange.mockImplementation((cb: (status: string) => void) => {
      statusCallback = cb;
      return () => {
        statusCallback = null;
      };
    });
    mockStartStream.mockResolvedValue(createMockStream());
    mockStartVideoTrack.mockResolvedValue(createMockTrack('video-1', 'video'));
    mockStartAudioTrack.mockResolvedValue(createMockTrack('audio-1', 'audio'));
    mockSwitchVideoDevice.mockResolvedValue(createMockTrack('video-2', 'video'));
    mockSwitchAudioDevice.mockResolvedValue(createMockTrack('audio-2', 'audio'));
    mockGetVideoDeviceId.mockReturnValue(null);
    mockGetAudioDeviceId.mockReturnValue(null);
  });

  describe('initial state', () => {
    it('returns idle status and null stream when no stream exists', () => {
      const { result } = renderHook(() => useLocalMedia());

      expect(result.current.status).toBe('idle');
      expect(result.current.stream).toBeNull();
    });

    it('returns active status and stream when stream already exists', () => {
      const mockStream = createMockStream();
      mockGetStream.mockReturnValue(mockStream);

      const { result } = renderHook(() => useLocalMedia());

      expect(result.current.status).toBe('active');
      expect(result.current.stream).toBe(mockStream);
    });
  });

  describe('autoStart option', () => {
    it('does not auto-start when autoStart is false', () => {
      renderHook(() => useLocalMedia({ autoStart: false }));

      expect(mockStartStream).not.toHaveBeenCalled();
    });

    it('auto-starts with default enabled states when autoStart is true', () => {
      renderHook(() => useLocalMedia({ autoStart: true }));

      expect(mockSetPreferredVideoEnabled).toHaveBeenCalledWith(true);
      expect(mockSetPreferredAudioEnabled).toHaveBeenCalledWith(true);
      expect(mockStartStream).toHaveBeenCalledWith(undefined);
    });

    it('auto-starts with custom enabled states', () => {
      renderHook(() =>
        useLocalMedia({
          autoStart: true,
          initialVideoEnabled: false,
          initialAudioEnabled: false,
        })
      );

      expect(mockSetPreferredVideoEnabled).toHaveBeenCalledWith(false);
      expect(mockSetPreferredAudioEnabled).toHaveBeenCalledWith(false);
    });

    it('auto-starts with custom constraints', () => {
      const constraints = { video: false, audio: true };

      renderHook(() =>
        useLocalMedia({
          autoStart: true,
          constraints,
        })
      );

      expect(mockStartStream).toHaveBeenCalledWith(constraints);
    });
  });

  describe('status subscription', () => {
    it('updates status and stream when status changes', () => {
      const { result } = renderHook(() => useLocalMedia());

      expect(result.current.status).toBe('idle');

      const newStream = createMockStream();
      mockGetStream.mockReturnValue(newStream);

      act(() => {
        statusCallback?.('active');
      });

      expect(result.current.status).toBe('active');
      expect(result.current.stream).toBe(newStream);
    });

    it('unsubscribes on unmount', () => {
      const unsubscribe = vi.fn();
      mockOnStatusChange.mockReturnValue(unsubscribe);

      const { unmount } = renderHook(() => useLocalMedia());

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('startStream', () => {
    it('starts stream and returns it on success', async () => {
      const mockStream = createMockStream();
      mockStartStream.mockResolvedValue(mockStream);

      const { result } = renderHook(() => useLocalMedia());

      let returnedStream: MediaStream | null = null;
      await act(async () => {
        returnedStream = await result.current.startStream();
      });

      expect(mockStartStream).toHaveBeenCalledWith(undefined);
      expect(returnedStream).toBe(mockStream);
    });

    it('starts stream with custom constraints', async () => {
      const constraints = { video: { deviceId: 'cam-1' }, audio: true };

      const { result } = renderHook(() => useLocalMedia());

      await act(async () => {
        await result.current.startStream(constraints);
      });

      expect(mockStartStream).toHaveBeenCalledWith(constraints);
    });

    it('returns null when startStream fails', async () => {
      mockStartStream.mockRejectedValue(new Error('Permission denied'));

      const { result } = renderHook(() => useLocalMedia());

      let returnedStream: MediaStream | null = createMockStream();
      await act(async () => {
        returnedStream = await result.current.startStream();
      });

      expect(returnedStream).toBeNull();
    });
  });

  describe('stopStream', () => {
    it('calls stopStream on the manager', () => {
      const { result } = renderHook(() => useLocalMedia());

      act(() => {
        result.current.stopStream();
      });

      expect(mockStopStream).toHaveBeenCalled();
    });
  });

  describe('startVideo', () => {
    it('returns true when video track starts successfully', async () => {
      const mockTrack = createMockTrack('video-1', 'video');
      mockStartVideoTrack.mockResolvedValue(mockTrack);

      const { result } = renderHook(() => useLocalMedia());

      let success = false;
      await act(async () => {
        success = await result.current.startVideo();
      });

      expect(mockStartVideoTrack).toHaveBeenCalled();
      expect(success).toBe(true);
    });

    it('returns false when video track fails to start', async () => {
      mockStartVideoTrack.mockResolvedValue(null);

      const { result } = renderHook(() => useLocalMedia());

      let success = true;
      await act(async () => {
        success = await result.current.startVideo();
      });

      expect(success).toBe(false);
    });
  });

  describe('stopVideo', () => {
    it('calls stopVideoTrack on the manager', () => {
      const { result } = renderHook(() => useLocalMedia());

      act(() => {
        result.current.stopVideo();
      });

      expect(mockStopVideoTrack).toHaveBeenCalled();
    });
  });

  describe('startAudio', () => {
    it('returns true when audio track starts successfully', async () => {
      const mockTrack = createMockTrack('audio-1', 'audio');
      mockStartAudioTrack.mockResolvedValue(mockTrack);

      const { result } = renderHook(() => useLocalMedia());

      let success = false;
      await act(async () => {
        success = await result.current.startAudio();
      });

      expect(mockStartAudioTrack).toHaveBeenCalled();
      expect(success).toBe(true);
    });

    it('returns false when audio track fails to start', async () => {
      mockStartAudioTrack.mockResolvedValue(null);

      const { result } = renderHook(() => useLocalMedia());

      let success = true;
      await act(async () => {
        success = await result.current.startAudio();
      });

      expect(success).toBe(false);
    });
  });

  describe('stopAudio', () => {
    it('calls stopAudioTrack on the manager', () => {
      const { result } = renderHook(() => useLocalMedia());

      act(() => {
        result.current.stopAudio();
      });

      expect(mockStopAudioTrack).toHaveBeenCalled();
    });
  });

  describe('switchVideoDevice', () => {
    it('returns true when video device switches successfully', async () => {
      const mockTrack = createMockTrack('video-2', 'video');
      mockSwitchVideoDevice.mockResolvedValue(mockTrack);

      const { result } = renderHook(() => useLocalMedia());

      let success = false;
      await act(async () => {
        success = await result.current.switchVideoDevice('camera-1');
      });

      expect(mockSwitchVideoDevice).toHaveBeenCalledWith('camera-1');
      expect(success).toBe(true);
    });

    it('returns false when video device switch fails', async () => {
      mockSwitchVideoDevice.mockResolvedValue(null);

      const { result } = renderHook(() => useLocalMedia());

      let success = true;
      await act(async () => {
        success = await result.current.switchVideoDevice('camera-1');
      });

      expect(success).toBe(false);
    });
  });

  describe('switchAudioDevice', () => {
    it('returns true when audio device switches successfully', async () => {
      const mockTrack = createMockTrack('audio-2', 'audio');
      mockSwitchAudioDevice.mockResolvedValue(mockTrack);

      const { result } = renderHook(() => useLocalMedia());

      let success = false;
      await act(async () => {
        success = await result.current.switchAudioDevice('mic-1');
      });

      expect(mockSwitchAudioDevice).toHaveBeenCalledWith('mic-1');
      expect(success).toBe(true);
    });

    it('returns false when audio device switch fails', async () => {
      mockSwitchAudioDevice.mockResolvedValue(null);

      const { result } = renderHook(() => useLocalMedia());

      let success = true;
      await act(async () => {
        success = await result.current.switchAudioDevice('mic-1');
      });

      expect(success).toBe(false);
    });
  });

  describe('getVideoDeviceId', () => {
    it('returns the current video device id', () => {
      mockGetVideoDeviceId.mockReturnValue('camera-1');

      const { result } = renderHook(() => useLocalMedia());

      expect(result.current.getVideoDeviceId()).toBe('camera-1');
    });

    it('returns null when no video device is selected', () => {
      mockGetVideoDeviceId.mockReturnValue(null);

      const { result } = renderHook(() => useLocalMedia());

      expect(result.current.getVideoDeviceId()).toBeNull();
    });
  });

  describe('getAudioDeviceId', () => {
    it('returns the current audio device id', () => {
      mockGetAudioDeviceId.mockReturnValue('mic-1');

      const { result } = renderHook(() => useLocalMedia());

      expect(result.current.getAudioDeviceId()).toBe('mic-1');
    });

    it('returns null when no audio device is selected', () => {
      mockGetAudioDeviceId.mockReturnValue(null);

      const { result } = renderHook(() => useLocalMedia());

      expect(result.current.getAudioDeviceId()).toBeNull();
    });
  });
});
