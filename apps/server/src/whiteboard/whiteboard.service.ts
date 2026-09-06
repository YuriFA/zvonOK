import { Injectable, Logger } from '@nestjs/common';
import { SfuService } from 'src/sfu/sfu.service';
import {
  WHITEBOARD_SNAPSHOT_MAX_BYTES,
  WhiteboardDrawMode,
} from './whiteboard.types';

interface BoardState {
  snapshot: string;
  mode: WhiteboardDrawMode;
  unsubscribeRoomClosed: () => void;
}

const EMPTY_SNAPSHOT = '{}';

/**
 * In-memory whiteboard state per room. The server is a dumb holder of the
 * latest serialized client store: clients publish their full store after
 * local changes, the server stores and relays it, and receiving clients
 * union-merge records by id. Boards are intentionally not persisted; a
 * server restart blanks them.
 */
@Injectable()
export class WhiteboardService {
  private readonly logger = new Logger(WhiteboardService.name);
  private readonly boards = new Map<string, BoardState>();

  constructor(private readonly sfu: SfuService) {}

  getBoard(roomId: string): { snapshot: string; mode: WhiteboardDrawMode } {
    const state = this.boards.get(roomId);
    if (state) return { snapshot: state.snapshot, mode: state.mode };
    return { snapshot: EMPTY_SNAPSHOT, mode: 'owner' };
  }

  /**
   * Store a participant's published store snapshot and return it for
   * relaying. Returns null when the payload is malformed or oversized;
   * an oversized board is refused, not truncated.
   */
  putSnapshot(roomId: string, snapshot: string): string | null {
    if (typeof snapshot !== 'string' || snapshot.length === 0) return null;
    if (Buffer.byteLength(snapshot) > WHITEBOARD_SNAPSHOT_MAX_BYTES) {
      return null;
    }
    const state = this.boards.get(roomId) ?? this.createBoard(roomId);
    state.snapshot = snapshot;
    return snapshot;
  }

  setMode(roomId: string, mode: WhiteboardDrawMode): WhiteboardDrawMode {
    const state = this.boards.get(roomId) ?? this.createBoard(roomId);
    state.mode = mode;
    return state.mode;
  }

  dropBoard(roomId: string): void {
    const state = this.boards.get(roomId);
    if (!state) return;
    state.unsubscribeRoomClosed();
    this.boards.delete(roomId);
    this.logger.log(`Whiteboard dropped for room ${roomId}`);
  }

  dropAll(): void {
    for (const [roomId] of this.boards) this.dropBoard(roomId);
  }

  private createBoard(roomId: string): BoardState {
    const state: BoardState = {
      snapshot: EMPTY_SNAPSHOT,
      mode: 'owner',
      unsubscribeRoomClosed: this.sfu.onRoomClosed(roomId, () => {
        this.dropBoard(roomId);
      }),
    };
    this.boards.set(roomId, state);
    return state;
  }
}
