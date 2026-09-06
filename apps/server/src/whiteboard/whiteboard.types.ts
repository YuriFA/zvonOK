export type WhiteboardDrawMode = 'owner' | 'open';

export interface WhiteboardJoinPayload {
  roomSlug: string;
}

export interface WhiteboardOpPayload {
  roomSlug: string;
  /** Full serialized client store (JSON string), capped in size. */
  snapshot: string;
}

export interface WhiteboardSnapshot {
  /** Serialized client store (JSON string), empty store when the board is blank. */
  snapshot: string;
  mode: WhiteboardDrawMode;
}

export interface WhiteboardModePayload {
  roomSlug: string;
  mode: WhiteboardDrawMode;
}

export const WHITEBOARD_SNAPSHOT_MAX_BYTES = 4 * 1024 * 1024;
