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
import { Server, Socket } from 'socket.io';
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

  afterInit(): void {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
    this.peerInfo.set(client.id, { id: client.id });
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
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ): RoomJoinedPayload {
    const { roomCode } = payload;
    const roomId = `room:${roomCode}`;

    this.logger.log(`Client ${client.id} joining room ${roomCode}`);

    const peerData = this.peerInfo.get(client.id) || { id: client.id };

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
    client.join(roomId);

    const peerJoinedPayload: PeerJoinedPayload = {
      peerId: client.id,
      userInfo: { username: peerData.username },
    };
    client.to(roomId).emit('peer:joined', peerJoinedPayload);

    const response: RoomJoinedPayload = {
      roomId,
      peerId: client.id,
      peers: existingPeers,
    };

    return response;
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
    client.leave(roomId);

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
      client.emit('webrtc:error', {
        error: 'Target peer not found',
        targetPeerId,
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
      client.emit('webrtc:error', {
        error: 'Target peer not found',
        targetPeerId,
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
      client.emit('webrtc:error', {
        error: 'Target peer not found',
        targetPeerId,
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
