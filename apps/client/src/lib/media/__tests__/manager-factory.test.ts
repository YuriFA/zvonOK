import { describe, expect, it } from 'vitest';
import { createMediaManager } from '../manager-factory';

describe('createMediaManager', () => {
  it('creates a MediaStreamManager with default deps', () => {
    const manager = createMediaManager();
    expect(manager).toBeDefined();
    expect(manager.videoCapture).toBeDefined();
    expect(manager.audioCapture).toBeDefined();
  });
});
