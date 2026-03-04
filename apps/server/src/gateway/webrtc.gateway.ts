import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { RoomService } from '../room/room.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  PeerInfo,
  RoomJoinedPayload,
  PeerJoinedPayload,
  PeerLeftPayload,
  JoinRoomPayload,
  OfferPayload,
  AnswerPayload,
  IcePayload,
  RtcOfferEvent,
  RtcAnswerEvent,
  RtcIceEvent,
  MediaStatePayload,
  MediaStateChangedPayload,
} from './interfaces/room.interface';

interface JwtPayload {
  id: string;
  email: string;
}

interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/',
})
export class WebrtcGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(WebrtcGateway.name);

  @WebSocketServer()
  server: Server;

  private rooms: Map<string, Set<string>> = new Map();
  private peerRooms: Map<string, string> = new Map();
  private peerInfo: Map<string, PeerInfo> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly roomService: RoomService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(): void {
    this.logger.log('WebSocket Gateway initialized');
  }

  private extractTokenFromCookies(
    cookieHeader: string | undefined,
    cookieName: string,
  ): string | null {
    if (!cookieHeader) return null;
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    const targetCookie = cookies.find((c) => c.startsWith(`${cookieName}=`));
    // Use slice instead of split('=')[1] to handle base64 padding ('=') in JWT tokens
    return targetCookie ? targetCookie.slice(cookieName.length + 1) : null;
  }

  async handleConnection(client: Socket): Promise<void> {
    this.logger.log(`Client connected: ${client.id}`);

    // Extract and verify JWT
    const token = this.extractTokenFromCookies(
      client.handshake.headers.cookie,
      'access_token',
    );

    if (!token) {
      this.logger.warn(`No access_token cookie for client ${client.id}`);
      client.emit('error', {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      client.disconnect(true);
      return;
    }

    try {
      const secret = this.configService.get<string>('JWT_ACCESS_SECRET')!;
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret,
      });

      // Fetch user to get username
      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true, email: true, username: true },
      });

      if (!user) {
        this.logger.warn(
          `User ${payload.id} not found for client ${client.id}`,
        );
        client.emit('error', {
          code: 'UNAUTHORIZED',
          message: 'User not found',
        });
        client.disconnect(true);
        return;
      }

      // Store user data in socket
      const authenticatedUser: AuthenticatedUser = {
        id: user.id,
        email: user.email,
        username: user.username,
      };

      (client.data as { user: AuthenticatedUser }).user = authenticatedUser;

      // Initialize peer info with user data
      this.peerInfo.set(client.id, {
        id: client.id,
        userInfo: {
          userId: user.id,
          username: user.username,
        },
      });

      this.logger.log(
        `Client ${client.id} authenticated as user ${user.username}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Authentication failed for client ${client.id}: ${message}`,
      );
      client.emit('error', { code: 'UNAUTHORIZED', message: 'Invalid token' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.handleLeaveRoom(client);
    this.peerInfo.delete(client.id);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): void {
    this.logger.log(`Received ping from ${client.id}`);
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  @SubscribeMessage('join:room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ): Promise<void> {
    const { roomCode } = payload;
    const roomId = `room:${roomCode}`;

    this.logger.log(`Client ${client.id} joining room ${roomCode}`);

    // Validate room exists in database
    try {
      await this.roomService.findBySlug(roomCode);
    } catch {
      this.logger.warn(`Room ${roomCode} not found for client ${client.id}`);
      client.emit('error', {
        code: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      });
      return;
    }

    const peerData = this.peerInfo.get(client.id);
    if (!peerData) {
      this.logger.warn(`No peer info for client ${client.id}`);
      client.emit('error', {
        code: 'UNAUTHORIZED',
        message: 'Peer not authenticated',
      });
      return;
    }

    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }

    const room = this.rooms.get(roomId)!;
    const existingPeers: PeerInfo[] = [];

    for (const peerId of room) {
      const info = this.peerInfo.get(peerId);
      if (info) {
        existingPeers.push(info);
      }
    }

    room.add(client.id);
    this.peerRooms.set(client.id, roomId);
    void client.join(roomId);

    // Broadcast peer joined to others in room
    const peerJoinedPayload: PeerJoinedPayload = {
      peerId: client.id,
      userInfo: { username: peerData.userInfo.username },
    };
    client.to(roomId).emit('peer:joined', peerJoinedPayload);

    // Emit room:joined to the joining client (instead of returning)
    const response: RoomJoinedPayload = {
      roomId,
      peerId: client.id,
      peers: existingPeers,
    };
    client.emit('room:joined', response);
  }

  @SubscribeMessage('leave:room')
  handleLeaveRoom(@ConnectedSocket() client: Socket): void {
    const roomId = this.peerRooms.get(client.id);

    if (!roomId) {
      return;
    }

    this.logger.log(`Client ${client.id} leaving room ${roomId}`);

    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(client.id);
      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }

    this.peerRooms.delete(client.id);
    void client.leave(roomId);

    const peerLeftPayload: PeerLeftPayload = { peerId: client.id };
    client.to(roomId).emit('peer:left', peerLeftPayload);
  }

  @SubscribeMessage('webrtc:offer')
  handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: OfferPayload,
  ): void {
    const { targetPeerId, offer } = payload;
    this.logger.log(`Forwarding offer from ${client.id} to ${targetPeerId}`);

    const targetSocket = this.server.sockets.sockets.get(targetPeerId);
    if (!targetSocket) {
      this.logger.warn(`Target peer ${targetPeerId} not found for offer`);
      client.emit('error', {
        code: 'PEER_NOT_FOUND',
        message: 'Target peer not found',
      });
      return;
    }

    const event: RtcOfferEvent = {
      fromPeerId: client.id,
      offer,
    };
    targetSocket.emit('webrtc:offer', event);
  }

  @SubscribeMessage('webrtc:answer')
  handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AnswerPayload,
  ): void {
    const { targetPeerId, answer } = payload;
    this.logger.log(`Forwarding answer from ${client.id} to ${targetPeerId}`);

    const targetSocket = this.server.sockets.sockets.get(targetPeerId);
    if (!targetSocket) {
      this.logger.warn(`Target peer ${targetPeerId} not found for answer`);
      client.emit('error', {
        code: 'PEER_NOT_FOUND',
        message: 'Target peer not found',
      });
      return;
    }

    const event: RtcAnswerEvent = {
      fromPeerId: client.id,
      answer,
    };
    targetSocket.emit('webrtc:answer', event);
  }

  @SubscribeMessage('webrtc:ice')
  handleIce(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: IcePayload,
  ): void {
    const { targetPeerId, candidate } = payload;
    this.logger.debug(`Forwarding ICE from ${client.id} to ${targetPeerId}`);

    const targetSocket = this.server.sockets.sockets.get(targetPeerId);
    if (!targetSocket) {
      this.logger.warn(`Target peer ${targetPeerId} not found for ICE`);
      client.emit('error', {
        code: 'PEER_NOT_FOUND',
        message: 'Target peer not found',
      });
      return;
    }

    const event: RtcIceEvent = {
      fromPeerId: client.id,
      candidate,
    };
    targetSocket.emit('webrtc:ice', event);
  }

  @SubscribeMessage('media:state')
  handleMediaState(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MediaStatePayload,
  ): void {
    const roomId = this.peerRooms.get(client.id);
    if (!roomId) {
      return;
    }

    this.logger.debug(
      `Media state from ${client.id}: video=${payload.isVideoEnabled}, audio=${payload.isAudioEnabled}`,
    );

    const event: MediaStateChangedPayload = {
      peerId: client.id,
      isVideoEnabled: payload.isVideoEnabled,
      isAudioEnabled: payload.isAudioEnabled,
    };
    client.to(roomId).emit('media:state_changed', event);
  }
}
