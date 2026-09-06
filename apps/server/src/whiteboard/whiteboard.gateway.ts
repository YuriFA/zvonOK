import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { SkipThrottle } from '@nestjs/throttler';
import {
  resolveRoomSocketIdentity,
  RoomSocketIdentity,
} from 'src/auth/helpers/room-socket-auth.helper';
import { GuestService } from 'src/room/guest.service';
import { RoomService } from 'src/room/room.service';
import { SfuService } from 'src/sfu/sfu.service';
import { WhiteboardService } from './whiteboard.service';
import type {
  WhiteboardJoinPayload,
  WhiteboardModePayload,
  WhiteboardOpPayload,
} from './whiteboard.types';

interface WhiteboardAdmission {
  roomId: string;
  roomSlug: string;
  isOwner: boolean;
}

@SkipThrottle()
@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/whiteboard',
})
export class WhiteboardGateway implements OnGatewayConnection {
  private readonly logger = new Logger(WhiteboardGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly whiteboardService: WhiteboardService,
    private readonly roomService: RoomService,
    private readonly sfu: SfuService,
    private readonly jwtService: JwtService,
    private readonly guestService: GuestService,
  ) {}

  handleConnection(client: Socket): void {
    const identity = resolveRoomSocketIdentity(
      client,
      this.jwtService,
      this.guestService,
    );
    if (!identity) {
      this.logger.warn(
        `Whiteboard client rejected (auth failed): ${client.id}`,
      );
      client.disconnect(true);
      return;
    }
    (client.data as Record<string, unknown>).identity = identity;
  }

  @SubscribeMessage('whiteboard:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: WhiteboardJoinPayload,
  ): Promise<void> {
    const identity = this.identityOf(client);
    if (!identity || typeof payload?.roomSlug !== 'string') return;

    const room = await this.resolveRoom(payload.roomSlug);
    if (!room) {
      client.emit('whiteboard:error', {
        event: 'whiteboard:join',
        message: 'Forbidden',
      });
      return;
    }

    if (identity.type === 'guest' && identity.roomSlug !== payload.roomSlug) {
      client.emit('whiteboard:error', {
        event: 'whiteboard:join',
        message: 'Forbidden',
      });
      return;
    }

    if (
      identity.type === 'user' &&
      !this.sfu.hasPeerInSlug(payload.roomSlug, identity.userId)
    ) {
      client.emit('whiteboard:error', {
        event: 'whiteboard:join',
        message: 'Forbidden',
      });
      return;
    }

    const admission: WhiteboardAdmission = {
      roomId: room.id,
      roomSlug: room.slug,
      isOwner: identity.type === 'user' && room.ownerId === identity.userId,
    };
    (client.data as Record<string, unknown>).admission = admission;
    await client.join(admission.roomId);
    client.emit(
      'whiteboard:snapshot',
      this.whiteboardService.getBoard(admission.roomId),
    );
  }

  @SubscribeMessage('whiteboard:op')
  async handleOp(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: WhiteboardOpPayload,
  ): Promise<void> {
    const admission = this.admissionOf(client);
    if (!admission || payload?.roomSlug !== admission.roomSlug) return;

    // Defense in depth: the client already renders read-only when locked.
    const { mode } = this.whiteboardService.getBoard(admission.roomId);
    if (mode !== 'open' && !admission.isOwner) return;

    const snapshot = this.whiteboardService.putSnapshot(
      admission.roomId,
      payload?.snapshot,
    );
    if (snapshot === null) {
      client.emit('whiteboard:error', {
        event: 'whiteboard:op',
        message: 'Board update rejected',
      });
      return;
    }

    // Relay to everyone else in the room.
    client.to(admission.roomId).emit('whiteboard:op', {
      roomSlug: admission.roomSlug,
      snapshot,
    });
  }

  @SubscribeMessage('whiteboard:mode')
  async handleMode(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: WhiteboardModePayload,
  ): Promise<void> {
    const identity = this.identityOf(client);
    const admission = this.admissionOf(client);
    if (
      !identity ||
      !admission ||
      identity.type !== 'user' ||
      payload?.roomSlug !== admission.roomSlug ||
      (payload?.mode !== 'owner' && payload?.mode !== 'open')
    ) {
      return;
    }

    // Re-verify ownership against current room state, not the cached join.
    const room = await this.resolveRoom(admission.roomSlug);
    if (!room || room.ownerId !== identity.userId) return;

    const mode = this.whiteboardService.setMode(admission.roomId, payload.mode);
    this.server.to(admission.roomId).emit('whiteboard:mode', {
      roomSlug: admission.roomSlug,
      mode,
    });
  }

  private identityOf(client: Socket): RoomSocketIdentity | null {
    return (
      ((client.data as Record<string, unknown>).identity as
        | RoomSocketIdentity
        | undefined) ?? null
    );
  }

  private admissionOf(client: Socket): WhiteboardAdmission | null {
    return (
      ((client.data as Record<string, unknown>).admission as
        | WhiteboardAdmission
        | undefined) ?? null
    );
  }
  /** Resolve an active room by slug; missing and ended rooms both reject. */
  private async resolveRoom(slug: string) {
    try {
      const room = await this.roomService.findBySlug(slug);
      return room.status === 'ended' ? null : room;
    } catch {
      return null;
    }
  }
}
