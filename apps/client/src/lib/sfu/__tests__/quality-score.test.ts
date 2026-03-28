import { describe, expect, it } from 'vitest';
import { calculateQualityScore } from '../quality-score';

describe('calculateQualityScore', () => {
  it('returns excellent for perfect stats', () => {
    const result = calculateQualityScore({
      bitrate: 2500,
      packetLoss: 0,
      rtt: 10,
      width: 1920,
      height: 1080,
      fps: 30,
    });
    expect(result.level).toBe('excellent');
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it('returns excellent with HD bonus (clamped to 100)', () => {
    const result = calculateQualityScore({
      bitrate: 2500,
      packetLoss: 0,
      rtt: 10,
      width: 1280,
      height: 720,
      fps: 30,
    });
    expect(result.level).toBe('excellent');
    expect(result.score).toBe(100);
  });

  it('penalizes high packet loss', () => {
    const result = calculateQualityScore({
      bitrate: 1000,
      packetLoss: 12,
      rtt: 20,
      width: 640,
      height: 480,
      fps: 30,
    });
    expect(result.score).toBeLessThanOrEqual(65);
  });

  it('returns poor for very bad stats', () => {
    const result = calculateQualityScore({
      bitrate: 100,
      packetLoss: 15,
      rtt: 600,
      width: 160,
      height: 120,
      fps: 5,
    });
    expect(result.level).toBe('poor');
    expect(result.score).toBeLessThan(40);
  });

  it('returns good for moderate packet loss', () => {
    const result = calculateQualityScore({
      bitrate: 1500,
      packetLoss: 6,
      rtt: 50,
      width: 640,
      height: 480,
      fps: 30,
    });
    expect(result.level).toBe('good');
  });

  it('penalizes high RTT', () => {
    const result = calculateQualityScore({
      bitrate: 1500,
      packetLoss: 0,
      rtt: 400,
      width: 640,
      height: 480,
      fps: 30,
    });
    expect(result.score).toBeLessThanOrEqual(90);
  });

  it('penalizes low FPS', () => {
    const result = calculateQualityScore({
      bitrate: 500,
      packetLoss: 0,
      rtt: 10,
      width: 640,
      height: 480,
      fps: 10,
    });
    expect(result.score).toBeLessThanOrEqual(95);
  });

  it('penalizes low resolution', () => {
    const result = calculateQualityScore({
      bitrate: 500,
      packetLoss: 0,
      rtt: 10,
      width: 200,
      height: 150,
      fps: 30,
    });
    expect(result.score).toBeLessThanOrEqual(95);
  });

  it('ignores resolution when width/height are 0', () => {
    const result = calculateQualityScore({
      bitrate: 500,
      packetLoss: 0,
      rtt: 10,
      width: 0,
      height: 0,
      fps: 0,
    });
    expect(result.score).toBe(100);
    expect(result.level).toBe('excellent');
  });

  it('clamps score to 0..100', () => {
    const result = calculateQualityScore({
      bitrate: 0,
      packetLoss: 50,
      rtt: 1000,
      width: 100,
      height: 100,
      fps: 1,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('returns fair for moderate stats', () => {
    const result = calculateQualityScore({
      bitrate: 500,
      packetLoss: 6,
      rtt: 600,
      width: 640,
      height: 480,
      fps: 30,
    });
    expect(result.level).toBe('fair');
  });
});
