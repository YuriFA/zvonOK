import type { GridLayout, LayoutOptions, VideoTile } from './types';

function computeGridDimensions(
  count: number,
  containerWidth: number,
  containerHeight: number,
  aspectRatio: number,
  gap: number,
): { cols: number; rows: number } {
  let bestCols = 1;
  let bestScore = 0;

  const maxCols = Math.max(1, count);

  for (let cols = 1; cols <= maxCols; cols++) {
    const rows = Math.ceil(count / cols);
    const availWidth = containerWidth - (cols - 1) * gap;
    const availHeight = containerHeight - (rows - 1) * gap;

    const tileW = availWidth / cols;
    const tileH = availHeight / rows;

    const fitByWidth = tileW;
    const fitByHeight = tileH * aspectRatio;
    const tileSide = Math.min(fitByWidth, fitByHeight);

    const totalW = tileSide * cols + (cols - 1) * gap;
    const totalH = (tileSide / aspectRatio) * rows + (rows - 1) * gap;

    const coverage = (totalW * totalH) / (containerWidth * containerHeight);

    if (coverage > bestScore) {
      bestScore = coverage;
      bestCols = cols;
    }
  }

  return { cols: bestCols, rows: Math.ceil(count / bestCols) };
}

export function computeLayout(options: LayoutOptions): GridLayout {
  const {
    containerWidth,
    containerHeight,
    participantCount,
    gap = 8,
    aspectRatio = 16 / 9,
    minTileSize = 120,
  } = options;

  if (participantCount <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    return { tiles: [], rows: 0, cols: 0, tileWidth: 0, tileHeight: 0 };
  }

  const { cols, rows } = computeGridDimensions(
    participantCount,
    containerWidth,
    containerHeight,
    aspectRatio,
    gap,
  );

  const availWidth = containerWidth - (cols - 1) * gap;
  const availHeight = containerHeight - (rows - 1) * gap;

  const maxTileW = availWidth / cols;
  const maxTileH = availHeight / rows;

  const tileByWidth = maxTileW;
  const tileByHeight = maxTileH * aspectRatio;
  const tileSide = Math.max(Math.min(tileByWidth, tileByHeight), minTileSize);

  const tileWidth = tileSide;
  const tileHeight = tileSide / aspectRatio;

  const totalGridWidth = tileWidth * cols + (cols - 1) * gap;
  const totalGridHeight = tileHeight * rows + (rows - 1) * gap;
  const offsetX = (containerWidth - totalGridWidth) / 2;
  const offsetY = (containerHeight - totalGridHeight) / 2;

  const tiles: VideoTile[] = [];

  for (let i = 0; i < participantCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    tiles.push({
      id: String(i),
      x: offsetX + col * (tileWidth + gap),
      y: offsetY + row * (tileHeight + gap),
      width: tileWidth,
      height: tileHeight,
    });
  }

  return { tiles, rows, cols, tileWidth, tileHeight };
}
