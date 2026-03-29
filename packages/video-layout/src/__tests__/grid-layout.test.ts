import { describe, expect, it } from 'vitest';
import { computeLayout } from '../grid-layout';

describe('computeLayout', () => {
  it('returns empty layout for zero participants', () => {
    const result = computeLayout({
      containerWidth: 1920,
      containerHeight: 1080,
      participantCount: 0,
    });
    expect(result.tiles).toHaveLength(0);
    expect(result.rows).toBe(0);
    expect(result.cols).toBe(0);
  });

  it('returns empty layout for negative participants', () => {
    const result = computeLayout({
      containerWidth: 1920,
      containerHeight: 1080,
      participantCount: -1,
    });
    expect(result.tiles).toHaveLength(0);
  });

  it('lays out a single participant centered', () => {
    const result = computeLayout({
      containerWidth: 1920,
      containerHeight: 1080,
      participantCount: 1,
    });
    expect(result.tiles).toHaveLength(1);
    expect(result.rows).toBe(1);
    expect(result.cols).toBe(1);

    const tile = result.tiles[0];
    expect(tile.width).toBe(result.tileWidth);
    expect(tile.height).toBe(result.tileHeight);

    const centerX = tile.x + tile.width / 2;
    const centerY = tile.y + tile.height / 2;
    expect(centerX).toBeCloseTo(960, 0);
    expect(centerY).toBeCloseTo(540, 0);
  });

  it('creates correct number of tiles', () => {
    const result = computeLayout({
      containerWidth: 1920,
      containerHeight: 1080,
      participantCount: 6,
    });
    expect(result.tiles).toHaveLength(6);
  });

  it('respects aspect ratio', () => {
    const result = computeLayout({
      containerWidth: 1920,
      containerHeight: 1080,
      participantCount: 1,
      aspectRatio: 4 / 3,
    });
    const tile = result.tiles[0];
    expect(tile.width / tile.height).toBeCloseTo(4 / 3, 2);
  });

  it('applies gap between tiles', () => {
    const gap = 16;
    const result = computeLayout({
      containerWidth: 1920,
      containerHeight: 1080,
      participantCount: 4,
      gap,
    });
    expect(result.tiles).toHaveLength(4);

    const col0 = result.tiles.filter(
      (_, i) => i % result.cols === 0,
    );
    const col1 = result.tiles.filter(
      (_, i) => i % result.cols === 1,
    );

    if (result.cols >= 2 && col0.length > 0 && col1.length > 0) {
      const gapActual = col1[0].x - (col0[0].x + col0[0].width);
      expect(gapActual).toBeCloseTo(gap, 1);
    }
  });

  it('handles 2 participants as 1x2 or 2x1', () => {
    const result = computeLayout({
      containerWidth: 1920,
      containerHeight: 1080,
      participantCount: 2,
    });
    expect(result.tiles).toHaveLength(2);
    expect(result.rows * result.cols).toBeGreaterThanOrEqual(2);
  });

  it('handles 9 participants as 3x3', () => {
    const result = computeLayout({
      containerWidth: 1920,
      containerHeight: 1080,
      participantCount: 9,
    });
    expect(result.tiles).toHaveLength(9);
    expect(result.cols).toBeGreaterThanOrEqual(3);
    expect(result.rows).toBeGreaterThanOrEqual(3);
  });

  it('no tile exceeds container bounds', () => {
    const result = computeLayout({
      containerWidth: 800,
      containerHeight: 600,
      participantCount: 7,
      gap: 10,
    });
    for (const tile of result.tiles) {
      expect(tile.x).toBeGreaterThanOrEqual(0);
      expect(tile.y).toBeGreaterThanOrEqual(0);
      expect(tile.x + tile.width).toBeLessThanOrEqual(801);
      expect(tile.y + tile.height).toBeLessThanOrEqual(601);
    }
  });

  it('respects minTileSize', () => {
    const result = computeLayout({
      containerWidth: 300,
      containerHeight: 200,
      participantCount: 2,
      minTileSize: 140,
    });
    for (const tile of result.tiles) {
      expect(tile.width).toBeGreaterThanOrEqual(140);
    }
  });
});
