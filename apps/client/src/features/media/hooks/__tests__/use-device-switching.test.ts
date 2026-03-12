import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSwitchVideoDevice = vi.hoisted(() => vi.fn());
const mockSwitchAudioDevice = vi.hoisted(() => vi.fn());
const mockWebrtcReplaceTrack = vi.hoisted(() => vi.fn());
const mockSfuReplaceTrack = vi.hoisted(() => vi.fn());

vi.mock('@/lib/media/manager', () => ({
  mediaManager: {
    switchVideoDevice: mockSwitchVideoDevice,
    switchAudioDevice: mockSwitchAudioDevice,
  },
}));

vi.mock('@/lib/webrtc/manager', () => ({
  webrtcManager: {
    replaceTrack: mockWebrtcReplaceTrack,
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
    mockWebrtcReplaceTrack.mockResolvedValue(true);
    mockSfuReplaceTrack.mockResolvedValue(true);
  });

  it('replaces the video track in both WebRTC and SFU managers', async () => {
    const newTrack = createTrack('video-1', 'video');
    mockSwitchVideoDevice.mockResolvedValue(newTrack);

    const { result } = renderHook(() => useDeviceSwitching());

    let success = false;
    await act(async () => {
      success = await result.current.switchVideoDevice('camera-1');
    });

    expect(success).toBe(true);
    expect(mockSwitchVideoDevice).toHaveBeenCalledWith('camera-1');
    expect(mockWebrtcReplaceTrack).toHaveBeenCalledWith('video', newTrack);
    expect(mockSfuReplaceTrack).toHaveBeenCalledWith('video', newTrack);
  });

  it('returns false when SFU track replacement fails for audio switching', async () => {
    const newTrack = createTrack('audio-1', 'audio');
    mockSwitchAudioDevice.mockResolvedValue(newTrack);
    mockWebrtcReplaceTrack.mockResolvedValue(true);
    mockSfuReplaceTrack.mockResolvedValue(false);

    const { result } = renderHook(() => useDeviceSwitching());

    let success = true;
    await act(async () => {
      success = await result.current.switchAudioDevice('microphone-1');
    });

    expect(success).toBe(false);
    expect(mockSwitchAudioDevice).toHaveBeenCalledWith('microphone-1');
    expect(mockWebrtcReplaceTrack).toHaveBeenCalledWith('audio', newTrack);
    expect(mockSfuReplaceTrack).toHaveBeenCalledWith('audio', newTrack);
  });
});