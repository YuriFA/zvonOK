import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import type { Socket } from 'socket.io';
import { WorkerManager } from './worker-manager';
import type {
  Peer,
  SfuJoinPayload,
  SfuTransportDirection,
  SfuTransportConnectPayload,
  SfuProducePayload,
  SfuConsumePayload,
} from './interfaces/sfu.interface';
import type { Consumer, Producer, WebRtcTransport } from 'mediasoup/types';
import { config } from './config/mediasoup.config';

@Injectable()
export class SfuService implements OnModuleDestroy {
  private readonly logger = new Logger(SfuService.name);
  private peers: Map<string, Peer> = new Map();
  private rooms: Map<string, Set<string>> = new Map();

  constructor(private readonly workerManager: WorkerManager) {
    void WorkerManager;
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing SFU Service...');
    for (const [, peers] of this.rooms) {
      for (const peerId of peers) {
        const peer = this.peers.get(peerId);
        if (!peer) continue;
        peer.sendTransport?.close();
        peer.recvTransport?.close();
      }
    }
    this.peers.clear();
    this.rooms.clear();
    this.logger.log('SFU Service closed');
  }

  private getPeer(socketId: string): Peer | undefined {
    return this.peers.get(socketId);
  }

  private getRoomId(socket: Socket): string | undefined {
    for (const [roomId, peers] of this.rooms) {
      if (peers.has(socket.id)) return roomId;
    }
    return undefined;
  }

  private getRoomPeers(roomId: string): Peer[] {
    const roomPeerIds = this.rooms.get(roomId);
    if (!roomPeerIds) return [];
    return Array.from(roomPeerIds)
      .map((id) => this.peers.get(id))
      .filter((p): p is Peer => p !== undefined);
  }

  private emitTransportCreated(
    socket: Socket,
    direction: SfuTransportDirection,
    transport: WebRtcTransport,
  ): void {
    socket.emit('sfu:transport-created', {
      direction,
      transportId: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    });
  }

  private emitNewProducer(target: Socket, producer: Producer, peer: Peer): void {
    target.emit('sfu:new-producer', {
      producerId: producer.id,
      userId: peer.userId,
      username: peer.username,
      kind: producer.kind,
    });
  }

  private notifyPeerLeft(roomId: string, userId: string, excludedSocketId: string): void {
    for (const roomPeer of this.getRoomPeers(roomId)) {
      if (roomPeer.id !== excludedSocketId) {
        roomPeer.socket.emit('sfu:peer-left', { userId });
      }
    }
  }

  private getTransport(
    peer: Peer,
    transportId: string,
  ): WebRtcTransport | undefined {
    if (peer.sendTransport?.id === transportId) {
      return peer.sendTransport;
    }

    if (peer.recvTransport?.id === transportId) {
      return peer.recvTransport;
    }

    return undefined;
  }

  private getConsumer(peer: Peer, consumerId: string): Consumer | undefined {
    return peer.consumers.get(consumerId);
  }

  async joinRoom(socket: Socket, payload: SfuJoinPayload): Promise<void> {
    const { roomId, userId, username } = payload;
    const peerId = socket.id;

    const peer: Peer = {
      id: peerId,
      userId,
      username,
      socket,
      producers: new Map(),
      consumers: new Map(),
    };
    this.peers.set(peerId, peer);

    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    const roomPeers = this.rooms.get(roomId);
    if (!roomPeers) {
      this.logger.error(`Failed to initialize room ${roomId}`);
      return;
    }

    roomPeers.add(peerId);
    this.logger.log(`Peer ${peerId} joined SFU room ${roomId}`);

    await this.workerManager.createRouter(roomId);

    const routerRtpCapabilities = this.workerManager.getRtpCapabilities(roomId);
    socket.emit('sfu:joined', { routerRtpCapabilities });
  }

  async leaveRoom(socket: Socket): Promise<void> {
    const peer = this.getPeer(socket.id);
    if (!peer) return;

    const roomId = this.getRoomId(socket);
    if (!roomId) return;

    this.rooms.get(roomId)?.delete(socket.id);
    peer.sendTransport?.close();
    peer.recvTransport?.close();
    this.peers.delete(socket.id);
    this.notifyPeerLeft(roomId, peer.userId, socket.id);
    this.logger.log(`Peer ${socket.id} left SFU room ${roomId}`);

    if (this.rooms.get(roomId)?.size === 0) {
      await this.workerManager.closeRouter(roomId);
      this.rooms.delete(roomId);
    }
  }

  async createSendTransport(socket: Socket): Promise<void> {
    const peer = this.getPeer(socket.id);
    const roomId = this.getRoomId(socket);
    const router = roomId ? this.workerManager.getRouter(roomId) : undefined;

    if (!peer || !router) {
      this.logger.error(!peer ? `Peer ${socket.id} not found` : 'No router found');
      return;
    }

    const transport = await router.createWebRtcTransport({
      listenIps: config.webRtcTransport.listenIps,
      enableUdp: config.webRtcTransport.enableUdp,
      enableTcp: config.webRtcTransport.enableTcp,
      preferUdp: config.webRtcTransport.preferUdp,
    });
    peer.sendTransport = transport;

    this.emitTransportCreated(socket, 'send', transport);
  }

  async createRecvTransport(socket: Socket): Promise<void> {
    const peer = this.getPeer(socket.id);
    const roomId = this.getRoomId(socket);
    const router = roomId ? this.workerManager.getRouter(roomId) : undefined;

    if (!peer || !router) {
      this.logger.error(!peer ? `Peer ${socket.id} not found` : 'No router found');
      return;
    }

    const transport = await router.createWebRtcTransport({
      listenIps: config.webRtcTransport.listenIps,
      enableUdp: config.webRtcTransport.enableUdp,
      enableTcp: config.webRtcTransport.enableTcp,
      preferUdp: config.webRtcTransport.preferUdp,
    });
    peer.recvTransport = transport;

    this.emitTransportCreated(socket, 'recv', transport);

    if (!roomId) {
      return;
    }

    for (const roomPeer of this.getRoomPeers(roomId)) {
      if (roomPeer.id === socket.id) {
        continue;
      }

      for (const producer of roomPeer.producers.values()) {
        this.emitNewProducer(socket, producer as Producer, roomPeer);
      }
    }
  }

  async connectTransport(
    socket: Socket,
    payload: SfuTransportConnectPayload,
  ): Promise<void> {
    const peer = this.getPeer(socket.id);
    if (!peer) {
      this.logger.error(`Peer ${socket.id} not found`);
      return;
    }

    const transport = this.getTransport(peer, payload.transportId);
    if (!transport) {
      this.logger.error(`Transport ${payload.transportId} not found`);
      return;
    }

    await transport.connect({ dtlsParameters: payload.dtlsParameters });
    socket.emit('sfu:transport-connected', {
      transportId: payload.transportId,
    });
  }

  async createProducer(socket: Socket, payload: SfuProducePayload): Promise<void> {
    const peer = this.getPeer(socket.id);
    if (!peer?.sendTransport) {
      this.logger.error(`No send transport for peer ${socket.id}`);
      return;
    }

    const { transportId, kind, rtpParameters } = payload;
    if (peer.sendTransport.id !== transportId) {
      this.logger.error(`Transport ${transportId} not found`);
      return;
    }

    const producer = await peer.sendTransport.produce({ kind, rtpParameters });
    peer.producers.set(producer.id, producer as Producer);

    socket.emit('sfu:producer-created', {
      producerId: producer.id,
      userId: peer.userId,
      kind,
    });

    this.notifyPeersToConsume(socket, producer as Producer);
  }

  async createConsumer(socket: Socket, payload: SfuConsumePayload): Promise<void> {
    const peer = this.getPeer(socket.id);
    const roomId = this.getRoomId(socket);
    const router = roomId ? this.workerManager.getRouter(roomId) : undefined;

    if (!peer?.recvTransport || !router) {
      this.logger.error('Missing peer transport or router');
      return;
    }

    const { producerId, rtpCapabilities } = payload;

    let targetProducer: Producer | undefined;
    for (const [, p] of this.peers) {
      const prod = p.producers.get(producerId);
      if (prod) {
        targetProducer = prod as Producer;
        break;
      }
    }

    if (!targetProducer) {
      this.logger.error(`Producer ${producerId} not found`);
      return;
    }

    if (!router.canConsume({ producerId, rtpCapabilities })) {
      this.logger.error('Cannot consume: RTP capabilities mismatch');
      return;
    }

    const consumer = await peer.recvTransport.consume({
      producerId,
      rtpCapabilities,
      paused: true,
    });
    peer.consumers.set(consumer.id, consumer);

    socket.emit('sfu:consumer-created', {
      consumerId: consumer.id,
      producerId,
      kind: targetProducer.kind,
      rtpParameters: consumer.rtpParameters,
    });
  }

  async resumeConsumer(socket: Socket, consumerId: string): Promise<void> {
    const peer = this.getPeer(socket.id);
    if (!peer) {
      this.logger.error(`Peer ${socket.id} not found`);
      return;
    }

    const consumer = this.getConsumer(peer, consumerId);
    if (!consumer) {
      this.logger.error(`Consumer ${consumerId} not found`);
      return;
    }

    await consumer.resume();
    socket.emit('sfu:consumer-resumed', {
      consumerId,
    });
  }

  async pauseProducer(socket: Socket, producerId: string): Promise<void> {
    const producer = this.getPeer(socket.id)?.producers.get(producerId);
    if (!producer) {
      this.logger.error(`Producer ${producerId} not found`);
      return;
    }
    await producer.pause();
  }

  async resumeProducer(socket: Socket, producerId: string): Promise<void> {
    const producer = this.getPeer(socket.id)?.producers.get(producerId);
    if (!producer) {
      this.logger.error(`Producer ${producerId} not found`);
      return;
    }
    await producer.resume();
  }

  async closePeer(socket: Socket): Promise<void> {
    const peer = this.getPeer(socket.id);
    const roomId = this.getRoomId(socket);

    if (!peer || !roomId) return;

    this.rooms.get(roomId)?.delete(socket.id);
    peer.sendTransport?.close();
    peer.recvTransport?.close();
    this.peers.delete(socket.id);
    this.notifyPeerLeft(roomId, peer.userId, socket.id);

    if (this.rooms.get(roomId)?.size === 0) {
      await this.workerManager.closeRouter(roomId);
      this.rooms.delete(roomId);
    }
  }

  private notifyPeersToConsume(socket: Socket, producer: Producer): void {
    const roomId = this.getRoomId(socket);
    const peer = this.getPeer(socket.id);
    if (!roomId || !peer) return;

    for (const roomPeer of this.getRoomPeers(roomId)) {
      if (roomPeer.id !== socket.id && roomPeer.recvTransport) {
        this.emitNewProducer(roomPeer.socket, producer, peer);
      }
    }
  }
}
