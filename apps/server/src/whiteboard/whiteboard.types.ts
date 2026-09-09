/**
 * Wire contract for the `/whiteboard` namespace.
 *
 * Mirrors packages/whiteboard-core/src/protocol.ts: the Nest build cannot
 * consume workspace TS source, so the constants live on both sides. The
 * whiteboard e2e suite pins the pair together - keep them in sync.
 */

export type WhiteboardDrawMode = 'owner' | 'open';

export const WHITEBOARD_UPDATE_MAX_BYTES = 512 * 1024;

export interface WhiteboardJoinPayload {
  roomSlug: string;
}

export interface WhiteboardStatePayload {
  roomSlug: string;
  /** Y.encodeStateAsUpdate of the room document. */
  update: Uint8Array;
}

export interface WhiteboardUpdatePayload {
  roomSlug: string;
  /** Incremental Yjs update from a participant. */
  update: Uint8Array;
}

export interface WhiteboardModePayload {
  roomSlug: string;
  mode: WhiteboardDrawMode;
}

export interface WhiteboardErrorPayload {
  event: string;
  message: string;
}
