import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSwitchVideoDevice = vi.hoisted(() => vi.fn());
const mockSwitchAudioDevice = vi.hoisted(() => vi.fn());
const mockHasVideoTrack = vi.hoisted(() => vi.fn());
const mockHasAudioTrack = vi.hoisted(() => vi.fn());
const mockSetSelectedVideoDeviceId = vi.hoisted(() => vi.fn());
const mockSetSelectedAudioDeviceId = vi.hoisted(() => vi.fn());
const mockSfuReplaceTrack = vi.hoisted(() => vi.fn());

vi.mock('@/lib/media/manager', () => ({
  mediaManager: {
    switchVideoDevice: mockSwitchVideoDevice,
    switchAudioDevice: mockSwitchAudioDevice,
    hasVideoTrack: mockHasVideoTrack,
    hasAudioTrack: mockHasAudioTrack,
    setSelectedVideoDeviceId: mockSetSelectedVideoDeviceId,
    setSelectedAudioDeviceId: mockSetSelectedAudioDeviceId,
  },
}));

vi.mock('@/lib/sfu/manager', () => ({
  sfuManager: {
    replaceTrack: mockSfuReplaceTrack,
  },
}));

import { useDeviceSwitching } from '../use-device-switching';

const createTrack = (id: string, kind: 'audio' | 'video') => ({
  id,
  kind,
  enabled: true,
}) as unknown as MediaStreamTrack;

describe('useDeviceSwitching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasVideoTrack.mockReturnValue(true);
    mockHasAudioTrack.mockReturnValue(true);
    mockSfuReplaceTrack.mockResolvedValue(true);
  });

  it('replaces the video track in SFU managers', async () => {
    const newTrack = createTrack('video-1', 'video');
    mockSwitchVideoDevice.mockResolvedValue(newTrack);

    const { result } = renderHook(() => useDeviceSwitching());

    let success = false;
    await act(async () => {
      success = await result.current.switchVideoDevice('camera-1');
    });

    expect(success).toBe(true);
    expect(mockSwitchVideoDevice).toHaveBeenCalledWith('camera-1');
    expect(mockSfuReplaceTrack).toHaveBeenCalledWith('video', newTrack);
  });

  it('persists the preferred camera without replacing tracks when video is off', async () => {
    mockHasVideoTrack.mockReturnValue(false);

    const { result } = renderHook(() => useDeviceSwitching());

    let success = false;
    await act(async () => {
      success = await result.current.switchVideoDevice('camera-2');
    });

    expect(success).toBe(true);
    expect(mockSetSelectedVideoDeviceId).toHaveBeenCalledWith('camera-2');
    expect(mockSwitchVideoDevice).not.toHaveBeenCalled();
    expect(mockSfuReplaceTrack).not.toHaveBeenCalled();
  });

  it('returns false when SFU track replacement fails for audio switching', async () => {
    const newTrack = createTrack('audio-1', 'audio');
    mockSwitchAudioDevice.mockResolvedValue(newTrack);
    mockSfuReplaceTrack.mockResolvedValue(false);

    const { result } = renderHook(() => useDeviceSwitching());

    let success = true;
    await act(async () => {
      success = await result.current.switchAudioDevice('microphone-1');
    });

    expect(success).toBe(false);
    expect(mockSwitchAudioDevice).toHaveBeenCalledWith('microphone-1');
    expect(mockSfuReplaceTrack).toHaveBeenCalledWith('audio', newTrack);
  });

  it('persists the preferred microphone without replacing tracks when audio is off', async () => {
    mockHasAudioTrack.mockReturnValue(false);

    const { result } = renderHook(() => useDeviceSwitching());

    let success = false;
    await act(async () => {
      success = await result.current.switchAudioDevice('microphone-2');
    });

    expect(success).toBe(true);
    expect(mockSetSelectedAudioDeviceId).toHaveBeenCalledWith('microphone-2');
    expect(mockSwitchAudioDevice).not.toHaveBeenCalled();
    expect(mockSfuReplaceTrack).not.toHaveBeenCalled();
  });
});
