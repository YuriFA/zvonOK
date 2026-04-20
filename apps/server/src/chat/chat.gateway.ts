import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { GuestService } from '../room/guest.service';
import { RoomService } from '../room/room.service';

type ClientIdentity =
  | { type: 'user'; userId: string }
  | { type: 'guest'; guestId: string; roomSlug: string; displayName: string };

@SkipThrottle()
@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly guestService: GuestService,
    private readonly roomService: RoomService,
  ) {}

  afterInit(): void {
    this.logger.log('Chat Gateway initialized');
  }

  handleConnection(client: Socket): void {
    const identity = this.authenticate(client);
    if (!identity) {
      this.logger.warn(`Chat client disconnected (auth failed): ${client.id}`);
      client.disconnect(true);
      return;
    }
    (client.data as Record<string, unknown>).identity = identity;
    const label =
      identity.type === 'user'
        ? `user:${identity.userId}`
        : `guest:${identity.guestId} (${identity.displayName})`;
    this.logger.log(`Chat client connected: ${client.id} (${label})`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Chat client disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat:send')
  async handleSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessageDto,
  ): Promise<void> {
    const identity = (client.data as Record<string, unknown>)
      .identity as ClientIdentity;

    if (identity.type === 'guest') {
      const room = await this.roomService.findBySlug(identity.roomSlug);
      if (!room || room.id !== payload.roomId) {
        client.emit('chat:error', {
          event: 'chat:send',
          message: 'Forbidden',
        });
        return;
      }
      const message = {
        id: randomUUID(),
        content: payload.content,
        roomId: payload.roomId,
        createdAt: new Date().toISOString(),
        isGuest: true,
        user: { id: identity.guestId, username: identity.displayName },
      };
      await client.join(payload.roomId);
      this.server.to(payload.roomId).emit('chat:message', message);
      return;
    }

    try {
      const message = await this.chatService.sendMessage(
        identity.userId,
        payload,
      );
      await client.join(payload.roomId);
      this.server.to(payload.roomId).emit('chat:message', message);
    } catch (err) {
      client.emit('chat:error', {
        event: 'chat:send',
        message: err instanceof Error ? err.message : 'Failed to send message',
      });
    }
  }

  @SubscribeMessage('chat:history')
  async handleHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody() { roomId }: { roomId: string },
  ) {
    const identity = (client.data as Record<string, unknown>)
      .identity as ClientIdentity;

    if (identity.type === 'guest') {
      const room = await this.roomService.findBySlug(identity.roomSlug);
      if (!room || room.id !== roomId) {
        client.emit('chat:error', {
          event: 'chat:history',
          message: 'Forbidden',
        });
        return;
      }
    }

    try {
      const result = await this.chatService.getMessages(roomId);
      await client.join(roomId);
      return result;
    } catch (err) {
      client.emit('chat:error', {
        event: 'chat:history',
        message: err instanceof Error ? err.message : 'Failed to load history',
      });
      return;
    }
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as Record<string, string | undefined>;
    if (auth?.token) return auth.token;

    const cookieHeader = client.handshake.headers?.cookie;
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split('; ');

    const accessCookie = cookies.find((c: string) =>
      c.startsWith('access_token='),
    );
    if (accessCookie) return accessCookie.split('=').slice(1).join('=') || null;

    const guestCookie = cookies.find((c: string) =>
      c.startsWith('zvonok_guest_'),
    );
    if (guestCookie) return guestCookie.split('=').slice(1).join('=') || null;

    return null;
  }

  private extractGuestSlugFromCookie(client: Socket): string | null {
    const cookieHeader = client.handshake.headers?.cookie;
    if (!cookieHeader) return null;
    const match = cookieHeader
      .split('; ')
      .find((c: string) => c.startsWith('zvonok_guest_'));
    if (!match) return null;
    const key = match.split('=')[0];
    return key.replace('zvonok_guest_', '') || null;
  }

  private authenticate(client: Socket): ClientIdentity | null {
    const token = this.extractToken(client);
    if (!token) return null;

    // Try guest token first (uses a separate secret)
    const roomSlug = this.extractGuestSlugFromCookie(client);
    if (roomSlug) {
      const guest = this.guestService.validateGuestToken(token, roomSlug);
      if (guest) {
        return {
          type: 'guest',
          guestId: guest.guestId,
          roomSlug,
          displayName: guest.displayName,
        };
      }
    }

    // Fall back to user token
    try {
      const payload = this.jwtService.verify<{ id: string }>(token);
      return { type: 'user', userId: payload.id };
    } catch {
      return null;
    }
  }
}
