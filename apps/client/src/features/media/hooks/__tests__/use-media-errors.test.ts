import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { classifyMediaError, useMediaErrors } from '../use-media-errors';

describe('classifyMediaError', () => {
  it('returns null for null input', () => {
    expect(classifyMediaError(null)).toBeNull();
  });

  it('classifies permission errors', () => {
    expect(classifyMediaError('Permission denied')).toBe('permission-denied');
    expect(classifyMediaError('NotAllowedError: not allowed')).toBe('permission-denied');
  });

  it('classifies not-found errors', () => {
    expect(classifyMediaError('NotFoundError: not found')).toBe('no-device');
    expect(classifyMediaError('no camera available')).toBe('no-device');
    expect(classifyMediaError('no microphone found')).toBe('no-device');
  });

  it('classifies unknown errors as generic error', () => {
    expect(classifyMediaError('Something went wrong')).toBe('error');
  });
});

describe('useMediaErrors', () => {
  function render(options: Parameters<typeof useMediaErrors>[0]) {
    return renderHook(() => useMediaErrors(options)).result.current;
  }

  describe('when user has deliberately disabled video/audio', () => {
    it('returns no error when video is disabled by the user (track unavailable intentionally)', () => {
      const result = render({
        streamError: null,
        isVideoAvailable: false,
        isAudioAvailable: true,
        isVideoEnabled: false,
        isAudioEnabled: true,
      });
      expect(result.videoError).toBeNull();
    });

    it('returns no error when audio is disabled by the user (track unavailable intentionally)', () => {
      const result = render({
        streamError: null,
        isVideoAvailable: true,
        isAudioAvailable: false,
        isVideoEnabled: true,
        isAudioEnabled: false,
      });
      expect(result.audioError).toBeNull();
    });

    it('returns no error for either track when both are disabled by the user', () => {
      const result = render({
        streamError: null,
        isVideoAvailable: false,
        isAudioAvailable: false,
        isVideoEnabled: false,
        isAudioEnabled: false,
      });
      expect(result.videoError).toBeNull();
      expect(result.audioError).toBeNull();
    });

    it('does not show stream error when user has disabled the track', () => {
      const result = render({
        streamError: 'Permission denied',
        isVideoAvailable: false,
        isAudioAvailable: false,
        isVideoEnabled: false,
        isAudioEnabled: false,
      });
      expect(result.videoError).toBeNull();
      expect(result.audioError).toBeNull();
    });
  });

  describe('when user wants the track enabled but device is unavailable', () => {
    it('returns no-device when video unavailable and user wants it on', () => {
      const result = render({
        streamError: null,
        isVideoAvailable: false,
        isAudioAvailable: true,
        isVideoEnabled: true,
        isAudioEnabled: true,
      });
      expect(result.videoError).toBe('no-device');
      expect(result.audioError).toBeNull();
    });

    it('returns no-device when audio unavailable and user wants it on', () => {
      const result = render({
        streamError: null,
        isVideoAvailable: true,
        isAudioAvailable: false,
        isVideoEnabled: true,
        isAudioEnabled: true,
      });
      expect(result.videoError).toBeNull();
      expect(result.audioError).toBe('no-device');
    });

    it('uses classified stream error when available and user wants video on', () => {
      const result = render({
        streamError: 'Permission denied',
        isVideoAvailable: false,
        isAudioAvailable: false,
        isVideoEnabled: true,
        isAudioEnabled: true,
      });
      expect(result.videoError).toBe('permission-denied');
      expect(result.audioError).toBe('permission-denied');
    });

    it('uses not-found stream error classification', () => {
      const result = render({
        streamError: 'NotFoundError: not found',
        isVideoAvailable: false,
        isAudioAvailable: false,
        isVideoEnabled: true,
        isAudioEnabled: true,
      });
      expect(result.videoError).toBe('no-device');
      expect(result.audioError).toBe('no-device');
    });
  });

  describe('when both tracks are available', () => {
    it('returns no errors', () => {
      const result = render({
        streamError: null,
        isVideoAvailable: true,
        isAudioAvailable: true,
        isVideoEnabled: true,
        isAudioEnabled: true,
      });
      expect(result.videoError).toBeNull();
      expect(result.audioError).toBeNull();
    });
  });
});
