import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CaptureState } from '../capture-state';
import type { IMediaDeviceService } from '../device-service';
import type { IErrorClassifier } from '../error-classifier';
import { MediaStreamManager } from '../manager';

const mockErrorClassifier: IErrorClassifier = {
  classify: () => ({
    state: CaptureState.DEVICE_ERROR,
    recoverable: false,
    reason: 'Error',
  }),
};

describe('MediaStreamManager', () => {
  let deviceService: IMediaDeviceService;
  let manager: MediaStreamManager;

  beforeEach(() => {
    deviceService = {
      getUserMedia: vi.fn(),
      enumerateDevices: vi.fn(),
      queryPermission: vi.fn(),
    };
    manager = new MediaStreamManager({ deviceService, errorClassifier: mockErrorClassifier });
  });

  it('exposes videoCapture and audioCapture', () => {
    expect(manager.videoCapture).toBeDefined();
    expect(manager.audioCapture).toBeDefined();
  });

  it('returns deviceService', () => {
    expect(manager.getDeviceService()).toBe(deviceService);
  });

  it('starts both video and audio by default', async () => {
    const videoTrack = { kind: 'video', stop: vi.fn(), getSettings: vi.fn(() => ({})), addEventListener: vi.fn() };
    const audioTrack = { kind: 'audio', stop: vi.fn(), getSettings: vi.fn(() => ({})), addEventListener: vi.fn() };

    (deviceService.getUserMedia as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ getTracks: () => [videoTrack] })
      .mockResolvedValueOnce({ getTracks: () => [audioTrack] });

    await manager.start();

    expect(deviceService.getUserMedia).toHaveBeenCalledTimes(2);
  });

  it('starts only video when audio is disabled', async () => {
    const videoTrack = { kind: 'video', stop: vi.fn(), getSettings: vi.fn(() => ({})), addEventListener: vi.fn() };
    (deviceService.getUserMedia as ReturnType<typeof vi.fn>).mockResolvedValue({
      getTracks: () => [videoTrack],
    });

    await manager.start({ audio: false });

    expect(deviceService.getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('starts only audio when video is disabled', async () => {
    const audioTrack = { kind: 'audio', stop: vi.fn(), getSettings: vi.fn(() => ({})), addEventListener: vi.fn() };
    (deviceService.getUserMedia as ReturnType<typeof vi.fn>).mockResolvedValue({
      getTracks: () => [audioTrack],
    });

    await manager.start({ video: false });

    expect(deviceService.getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('stops both captures', async () => {
    const videoTrack = { kind: 'video', stop: vi.fn(), getSettings: vi.fn(() => ({})), addEventListener: vi.fn() };
    const audioTrack = { kind: 'audio', stop: vi.fn(), getSettings: vi.fn(() => ({})), addEventListener: vi.fn() };

    (deviceService.getUserMedia as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ getTracks: () => [videoTrack] })
      .mockResolvedValueOnce({ getTracks: () => [audioTrack] });

    await manager.start();
    manager.stop();

    expect(manager.videoCapture.getState()).toBe(CaptureState.STOPPED);
    expect(manager.audioCapture.getState()).toBe(CaptureState.STOPPED);
  });

  it('delegates onVideoStateChange to videoCapture', () => {
    const callback = vi.fn();
    manager.onVideoStateChange(callback);
    manager.videoCapture.stop();
    expect(callback).toHaveBeenCalled();
  });

  it('delegates onAudioStateChange to audioCapture', () => {
    const callback = vi.fn();
    manager.onAudioStateChange(callback);
    manager.audioCapture.stop();
    expect(callback).toHaveBeenCalled();
  });
});
