import type { GridLayout, LayoutOptions, SpotlightArea, VideoTile } from "./types";

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
  if (options.spotlight) {
    return computeSpotlightLayout(options);
  }

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

/**
 * Spotlight layout: reserves most of the container for a screen-share area,
 * then fits participant tiles in a strip on one side.
 *
 * Strip position is chosen automatically:
 *   containerWidth / containerHeight > 1.5  →  strip on the right (vertical column)
 *   otherwise                               →  strip on the bottom (horizontal row)
 */
function computeSpotlightLayout(options: LayoutOptions): GridLayout {
  const {
    containerWidth,
    containerHeight,
    participantCount,
    gap = 8,
    aspectRatio = 16 / 9,
  } = options;

  if (containerWidth <= 0 || containerHeight <= 0) {
    return { tiles: [], rows: 0, cols: 0, tileWidth: 0, tileHeight: 0 };
  }

  // Strip size: 160 px wide (right) or 96 px tall (bottom), minimum 1 tile
  const STRIP_WIDTH = 160;
  const STRIP_HEIGHT = 96;

  const isWide = containerWidth / containerHeight > 1.5;
  const stripPosition = isWide ? "right" : "bottom";

  let spotlightArea: SpotlightArea;
  let stripX: number;
  let stripY: number;
  let stripAvailableWidth: number;
  let stripAvailableHeight: number;

  if (stripPosition === "right") {
    const spotW = containerWidth - STRIP_WIDTH - gap;
    spotlightArea = { x: 0, y: 0, width: spotW, height: containerHeight };
    stripX = spotW + gap;
    stripY = 0;
    stripAvailableWidth = STRIP_WIDTH;
    stripAvailableHeight = containerHeight;
  } else {
    const spotH = containerHeight - STRIP_HEIGHT - gap;
    spotlightArea = { x: 0, y: 0, width: containerWidth, height: spotH };
    stripX = 0;
    stripY = spotH + gap;
    stripAvailableWidth = containerWidth;
    stripAvailableHeight = STRIP_HEIGHT;
  }

  // If there are no participants at all, return just spotlight with no tiles
  if (participantCount <= 0) {
    return {
      tiles: [],
      rows: 0,
      cols: 0,
      tileWidth: 0,
      tileHeight: 0,
      spotlightArea,
      stripPosition,
    };
  }

  // Compute tile dimensions that fit in the strip
  let tileWidth: number;
  let tileHeight: number;
  let rows: number;
  let cols: number;

  if (stripPosition === "right") {
    // All tiles stack vertically in the column
    tileWidth = stripAvailableWidth;
    const totalGaps = (participantCount - 1) * gap;
    tileHeight = Math.max(1, (stripAvailableHeight - totalGaps) / participantCount);
    // Honour aspect ratio: shrink height if tile would be taller than wide
    const maxHeightByAspect = tileWidth / aspectRatio;
    if (tileHeight > maxHeightByAspect) {
      tileHeight = maxHeightByAspect;
    }
    const totalStack = participantCount * tileHeight + (participantCount - 1) * gap;
    stripY += Math.max(0, (stripAvailableHeight - totalStack) / 2);
    rows = participantCount;
    cols = 1;
  } else {
    // All tiles sit in a horizontal row
    tileHeight = stripAvailableHeight;
    tileWidth = tileHeight * aspectRatio;
    const totalRow = participantCount * tileWidth + (participantCount - 1) * gap;
    if (totalRow > stripAvailableWidth) {
      tileWidth = (stripAvailableWidth - (participantCount - 1) * gap) / participantCount;
      tileHeight = tileWidth / aspectRatio;
    }
    stripX += Math.max(
      0,
      (stripAvailableWidth - (participantCount * tileWidth + (participantCount - 1) * gap)) / 2,
    );
    rows = 1;
    cols = participantCount;
  }

  const tiles: VideoTile[] = [];

  for (let i = 0; i < participantCount; i++) {
    let x: number;
    let y: number;

    if (stripPosition === "right") {
      x = stripX;
      y = stripY + i * (tileHeight + gap);
    } else {
      x = stripX + i * (tileWidth + gap);
      y = stripY;
    }

    tiles.push({ id: String(i), x, y, width: tileWidth, height: tileHeight });
  }

  return { tiles, rows, cols, tileWidth, tileHeight, spotlightArea, stripPosition };
}
