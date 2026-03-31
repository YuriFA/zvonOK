/**
 * Quality score calculation for SFU streams.
 * Pure functions for calculating stream quality based on WebRTC stats.
 */

import type { QualityStats, QualityScore, QualityLevel } from "./types";

/**
 * Get quality level from score.
 */
function getQualityLevel(score: number): QualityLevel {
  if (score >= 80) {
    return "excellent";
  } else if (score >= 60) {
    return "good";
  } else if (score >= 40) {
    return "fair";
  } else {
    return "poor";
  }
}

/**
 * Calculate quality score based on WebRTC stats.
 * Returns a score from 0-100 and a quality level.
 */
export function calculateQualityScore(stats: QualityStats): QualityScore {
  let score = 100;

  // Packet loss penalty (most important)
  if (stats.packetLoss > 10) {
    score -= 40;
  } else if (stats.packetLoss > 5) {
    score -= 25;
  } else if (stats.packetLoss > 2) {
    score -= 10;
  } else if (stats.packetLoss > 0.5) {
    score -= 5;
  }

  // RTT penalty
  if (stats.rtt > 500) {
    score -= 25;
  } else if (stats.rtt > 300) {
    score -= 15;
  } else if (stats.rtt > 150) {
    score -= 5;
  }

  // Resolution bonus/penalty (for video)
  if (stats.width > 0 && stats.height > 0) {
    if (stats.width >= 1280 && stats.height >= 720) {
      score += 5; // HD bonus
    } else if (stats.width < 320 || stats.height < 240) {
      score -= 10; // Low resolution penalty
    }
  }

  // FPS penalty (for video)
  if (stats.fps > 0 && stats.fps < 15) {
    score -= 10;
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Determine level
  const level: QualityLevel = getQualityLevel(score);

  return { level, score };
}
