export interface VideoTile {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutOptions {
  containerWidth: number;
  containerHeight: number;
  participantCount: number;
  gap?: number;
  aspectRatio?: number;
  minTileSize?: number;
}

export interface GridLayout {
  tiles: VideoTile[];
  rows: number;
  cols: number;
  tileWidth: number;
  tileHeight: number;
}
