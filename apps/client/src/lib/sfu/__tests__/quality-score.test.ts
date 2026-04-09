import { describe, expect, it } from "vitest";

import { calculateQualityScore, qualityToSpatialLayer } from "../quality-score";

describe("calculateQualityScore", () => {
  it("returns excellent for perfect stats", () => {
    const result = calculateQualityScore({
      bitrate: 2500,
      packetLoss: 0,
      rtt: 10,
      jitter: 0,
      width: 1920,
      height: 1080,
      fps: 30,
    });
    expect(result.level).toBe("excellent");
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("returns excellent with HD bonus (clamped to 100)", () => {
    const result = calculateQualityScore({
      bitrate: 2500,
      packetLoss: 0,
      rtt: 10,
      jitter: 0,
      width: 1280,
      height: 720,
      fps: 30,
    });
    expect(result.level).toBe("excellent");
    expect(result.score).toBe(100);
  });

  it("penalizes high packet loss", () => {
    const result = calculateQualityScore({
      bitrate: 1000,
      packetLoss: 12,
      rtt: 20,
      jitter: 0,
      width: 640,
      height: 480,
      fps: 30,
    });
    expect(result.score).toBeLessThanOrEqual(65);
  });

  it("returns poor for very bad stats", () => {
    const result = calculateQualityScore({
      bitrate: 100,
      packetLoss: 15,
      rtt: 600,
      jitter: 0,
      width: 160,
      height: 120,
      fps: 5,
    });
    expect(result.level).toBe("poor");
    expect(result.score).toBeLessThan(40);
  });

  it("returns good for moderate packet loss", () => {
    const result = calculateQualityScore({
      bitrate: 1500,
      packetLoss: 6,
      rtt: 50,
      jitter: 0,
      width: 640,
      height: 480,
      fps: 30,
    });
    expect(result.level).toBe("good");
  });

  it("penalizes high RTT", () => {
    const result = calculateQualityScore({
      bitrate: 1500,
      packetLoss: 0,
      rtt: 400,
      jitter: 0,
      width: 640,
      height: 480,
      fps: 30,
    });
    expect(result.score).toBeLessThanOrEqual(90);
  });

  it("penalizes low FPS", () => {
    const result = calculateQualityScore({
      bitrate: 500,
      packetLoss: 0,
      rtt: 10,
      jitter: 0,
      width: 640,
      height: 480,
      fps: 10,
    });
    expect(result.score).toBeLessThanOrEqual(95);
  });

  it("penalizes low resolution", () => {
    const result = calculateQualityScore({
      bitrate: 500,
      packetLoss: 0,
      rtt: 10,
      jitter: 0,
      width: 200,
      height: 150,
      fps: 30,
    });
    expect(result.score).toBeLessThanOrEqual(95);
  });

  it("ignores resolution when width/height are 0", () => {
    const result = calculateQualityScore({
      bitrate: 500,
      packetLoss: 0,
      rtt: 10,
      jitter: 0,
      width: 0,
      height: 0,
      fps: 0,
    });
    expect(result.score).toBe(100);
    expect(result.level).toBe("excellent");
  });

  it("clamps score to 0..100", () => {
    const result = calculateQualityScore({
      bitrate: 0,
      packetLoss: 50,
      rtt: 1000,
      jitter: 200,
      width: 100,
      height: 100,
      fps: 1,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("returns fair for moderate stats", () => {
    const result = calculateQualityScore({
      bitrate: 500,
      packetLoss: 6,
      rtt: 600,
      jitter: 0,
      width: 640,
      height: 480,
      fps: 30,
    });
    expect(result.level).toBe("fair");
  });

  it("penalizes jitter above 100ms by 20 points", () => {
    const baseline = calculateQualityScore({
      bitrate: 1500,
      packetLoss: 0,
      rtt: 50,
      jitter: 0,
      width: 640,
      height: 480,
      fps: 30,
    });
    const highJitter = calculateQualityScore({
      bitrate: 1500,
      packetLoss: 0,
      rtt: 50,
      jitter: 110,
      width: 640,
      height: 480,
      fps: 30,
    });
    expect(baseline.score - highJitter.score).toBe(20);
  });

  it("penalizes jitter above 50ms by 10 points", () => {
    const baseline = calculateQualityScore({
      bitrate: 1500,
      packetLoss: 0,
      rtt: 50,
      jitter: 0,
      width: 640,
      height: 480,
      fps: 30,
    });
    const midJitter = calculateQualityScore({
      bitrate: 1500,
      packetLoss: 0,
      rtt: 50,
      jitter: 60,
      width: 640,
      height: 480,
      fps: 30,
    });
    expect(baseline.score - midJitter.score).toBe(10);
  });

  it("penalizes jitter above 20ms by 5 points", () => {
    const baseline = calculateQualityScore({
      bitrate: 1500,
      packetLoss: 0,
      rtt: 50,
      jitter: 0,
      width: 640,
      height: 480,
      fps: 30,
    });
    const lowJitter = calculateQualityScore({
      bitrate: 1500,
      packetLoss: 0,
      rtt: 50,
      jitter: 25,
      width: 640,
      height: 480,
      fps: 30,
    });
    expect(baseline.score - lowJitter.score).toBe(5);
  });

  it("does not penalize jitter at or below 20ms", () => {
    const baseline = calculateQualityScore({
      bitrate: 1500,
      packetLoss: 0,
      rtt: 50,
      jitter: 0,
      width: 640,
      height: 480,
      fps: 30,
    });
    const noJitter = calculateQualityScore({
      bitrate: 1500,
      packetLoss: 0,
      rtt: 50,
      jitter: 20,
      width: 640,
      height: 480,
      fps: 30,
    });
    expect(baseline.score).toBe(noJitter.score);
  });
});

describe("qualityToSpatialLayer", () => {
  it("returns 2 (high) for excellent quality", () => {
    expect(qualityToSpatialLayer("excellent")).toBe(2);
  });

  it("returns 2 (high) for good quality", () => {
    expect(qualityToSpatialLayer("good")).toBe(2);
  });

  it("returns 1 (mid) for fair quality", () => {
    expect(qualityToSpatialLayer("fair")).toBe(1);
  });

  it("returns 0 (low) for poor quality", () => {
    expect(qualityToSpatialLayer("poor")).toBe(0);
  });
});
