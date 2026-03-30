import { describe, expect, it, vi } from 'vitest';
import { CaptureState } from '../capture-state';
import { createMediaManager } from '../manager-factory';

describe('createMediaManager', () => {
  it('creates a MediaStreamManager with default deps', () => {
    const manager = createMediaManager();
    expect(manager).toBeDefined();
    expect(manager.videoCapture).toBeDefined();
    expect(manager.audioCapture).toBeDefined();
  });

  it('creates a manager with custom deviceService', () => {
    const customDeviceService = {
      getUserMedia: vi.fn(),
      enumerateDevices: vi.fn(),
      queryPermission: vi.fn(),
    };
    const manager = createMediaManager({ deviceService: customDeviceService });
    expect(manager.getDeviceService()).toBe(customDeviceService);
  });

  it('creates a manager with custom errorClassifier', () => {
    const customClassifier = {
      classify: vi.fn(() => ({
        state: CaptureState.DEVICE_ERROR,
        recoverable: false,
        reason: 'test',
      })),
    };
    const manager = createMediaManager({ errorClassifier: customClassifier });
    expect(manager).toBeDefined();
  });
});
