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
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

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
  ) {}

  afterInit(): void {
    this.logger.log('Chat Gateway initialized');
  }

  handleConnection(client: Socket): void {
    const userId = this.authenticate(client);
    if (!userId) {
      this.logger.warn(`Chat client disconnected (auth failed): ${client.id}`);
      client.disconnect(true);
      return;
    }
    (client.data as Record<string, unknown>).userId = userId;
    this.logger.log(`Chat client connected: ${client.id} (user: ${userId})`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Chat client disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat:send')
  async handleSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessageDto,
  ): Promise<void> {
    const userId = (client.data as Record<string, unknown>).userId as string;
    try {
      const message = await this.chatService.sendMessage(userId, payload);
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

    const match = cookieHeader
      .split('; ')
      .find((c: string) => c.startsWith('access_token='));
    return match ? match.split('=').slice(1).join('=') || null : null;
  }

  private authenticate(client: Socket): string | null {
    const token = this.extractToken(client);
    console.log(`[DEVLOG] Extracted token for client ${client.id}:`, token);
    if (!token) return null;

    try {
      const payload = this.jwtService.verify<{ id: string }>(token);
      console.log(
        `[DEVLOG] Authenticated chat client ${client.id} as user ${payload.id}`,
      );
      return payload.id;
    } catch (error) {
      console.error('[DEVLOG] JWT verification failed:', error);
      return null;
    }
  }
}
