import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CaptureState } from '../capture-state';
import { DefaultErrorClassifier } from '../error-classifier';

describe('DefaultErrorClassifier', () => {
  let classifier: DefaultErrorClassifier;

  beforeEach(() => {
    classifier = new DefaultErrorClassifier();
  });

  it('classifies NotAllowedError without "system" as DEVICE_NOT_FOUND', () => {
    const error = new DOMException('Permission denied', 'NotAllowedError');
    const result = classifier.classify(error, 'video');
    expect(result.state).toBe(CaptureState.DEVICE_NOT_FOUND);
    expect(result.recoverable).toBe(true);
    expect(result.reason).toContain('Camera');
  });

  it('classifies NotAllowedError with "system" as SYSTEM_DENIED', () => {
    const error = new DOMException('Permission denied by system', 'NotAllowedError');
    const result = classifier.classify(error, 'audio');
    expect(result.state).toBe(CaptureState.SYSTEM_DENIED);
    expect(result.recoverable).toBe(false);
    expect(result.reason).toContain('system');
  });

  it('classifies NotFoundError as DEVICE_NOT_FOUND', () => {
    const error = new DOMException('Device not found', 'NotFoundError');
    const result = classifier.classify(error, 'video');
    expect(result.state).toBe(CaptureState.DEVICE_NOT_FOUND);
    expect(result.recoverable).toBe(true);
  });

  it('classifies NotReadableError as DEVICE_IN_USE', () => {
    const error = new DOMException('Device in use', 'NotReadableError');
    const result = classifier.classify(error, 'audio');
    expect(result.state).toBe(CaptureState.DEVICE_IN_USE);
    expect(result.recoverable).toBe(true);
    expect(result.reason).toContain('another app');
  });

  it('classifies OverconstrainedError as DEVICE_ERROR', () => {
    const error = new DOMException('Overconstrained', 'OverconstrainedError');
    const result = classifier.classify(error, 'video');
    expect(result.state).toBe(CaptureState.DEVICE_ERROR);
    expect(result.recoverable).toBe(true);
  });

  it('classifies AbortError as CAPTURE_CANCELED', () => {
    const error = new Error('Aborted');
    error.name = 'AbortError';
    const result = classifier.classify(error, 'audio');
    expect(result.state).toBe(CaptureState.CAPTURE_CANCELED);
    expect(result.recoverable).toBe(true);
  });

  it('classifies unknown errors as DEVICE_ERROR', () => {
    const result = classifier.classify(new Error('Unknown'), 'video');
    expect(result.state).toBe(CaptureState.DEVICE_ERROR);
    expect(result.recoverable).toBe(false);
  });

  it('uses correct label for audio kind', () => {
    const error = new DOMException('No device', 'NotFoundError');
    const result = classifier.classify(error, 'audio');
    expect(result.reason).toContain('microphone');
  });

  it('uses correct label for video kind', () => {
    const error = new DOMException('No device', 'NotFoundError');
    const result = classifier.classify(error, 'video');
    expect(result.reason).toContain('camera');
  });
});
