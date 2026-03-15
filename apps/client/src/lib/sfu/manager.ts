import { io } from 'socket.io-client';
import { Device } from 'mediasoup-client';
import type { Socket } from 'socket.io-client';
import type {
  Consumer,
  DtlsParameters,
  MediaKind,
  Producer,
  RtpCapabilities,
  RtpParameters,
  Transport,
} from 'mediasoup-client/types';
import type {
  SfuJoinPayload,
  SfuJoinedPayload,
  SfuTransportCreatedPayload,
  SfuProducerCreatedPayload,
  SfuNewProducerPayload,
  SfuConsumerCreatedPayload,
  SfuKickPeerPayload,
  SfuKickedPayload,
  SfuState,
  SfuStateCallback,
  SfuTrackCallback,
  SfuPeerCallback,
  SfuPeerInfo,
  SfuPeerJoinedPayload,
  SfuExistingPeersPayload,
  QualityStats,
  QualityScore,
  PeerQualityStats,
  QualityStatsCallback,
} from './types';

const SOCKET_URL = (import.meta.env as { VITE_SOCKET_URL?: string }).VITE_SOCKET_URL ?? 'http://localhost:3000';

// Quality score calculation based on stats
function calculateQualityScore(stats: QualityStats): QualityScore {
  let score = 100;

  // Packet loss penalty (most important)
  if (stats.packetLoss > 10) {
    score -= 40;
  } else if (stats.packetLoss > 5) {
    score -= 25;
  } else if (stats.packetLoss > 2) {
    score -= 10;
  } else if (stats.packetLoss > 0.5) {
    score -= 5;
  }

  // RTT penalty
  if (stats.rtt > 500) {
    score -= 25;
  } else if (stats.rtt > 300) {
    score -= 15;
  } else if (stats.rtt > 150) {
    score -= 5;
  }

  // Resolution bonus/penalty (for video)
  if (stats.width > 0 && stats.height > 0) {
    if (stats.width >= 1280 && stats.height >= 720) {
      score += 5; // HD bonus
    } else if (stats.width < 320 || stats.height < 240) {
      score -= 10; // Low resolution penalty
    }
  }

  // FPS penalty (for video)
  if (stats.fps > 0 && stats.fps < 15) {
    score -= 10;
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Determine level
  let level: QualityScore['level'];
  if (score >= 80) {
    level = 'excellent';
  } else if (score >= 60) {
    level = 'good';
  } else if (score >= 40) {
    level = 'fair';
  } else {
    level = 'poor';
  }

  return { level, score };
}

export class SfuManager {
  private socket: Socket | null = null;
  private device: Device | null = null;
  private sendTransport: Transport | null = null;
  private recvTransport: Transport | null = null;
  private producers: Map<string, Producer> = new Map();
  private consumers: Map<string, Consumer> = new Map();
  private peers: Map<string, SfuPeerInfo> = new Map();

  private state: SfuState = {
    connectionState: 'disconnected',
    isDeviceLoaded: false,
    isSendTransportCreated: false,
    sendTransportConnected: false,
    recvTransportConnected: false,
    audioProducerId: null,
    videoProducerId: null,
  };

  private stateCallbacks: Set<SfuStateCallback> = new Set();
  private trackCallbacks: Set<SfuTrackCallback> = new Set();
  private peerJoinedCallbacks: Set<SfuPeerCallback> = new Set();
  private peerLeftCallbacks: Set<(userId: string) => void> = new Set();
  private kickedCallbacks: Set<(payload: SfuKickedPayload) => void> = new Set();
  private qualityStatsCallbacks: Set<QualityStatsCallback> = new Set();
  private pendingNewProducers: SfuNewProducerPayload[] = [];
  private statsInterval: ReturnType<typeof setInterval> | null = null;

  // Connect to SFU namespace
  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.updateState({ connectionState: 'connecting' });

    this.socket = io(`${SOCKET_URL}/sfu`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupEventListeners();
  }

  // Disconnect from SFU namespace
  disconnect(): void {
    this.stopStatsCollection();
    this.closeAll();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.resetState();
  }

  private resetState(): void {
    this.device = null;
    this.sendTransport = null;
    this.recvTransport = null;
    this.producers.clear();
    this.consumers.clear();
    this.peers.clear();
    this.pendingNewProducers = [];
    this.state = {
      connectionState: 'disconnected',
      isDeviceLoaded: false,
      isSendTransportCreated: false,
      sendTransportConnected: false,
      recvTransportConnected: false,
      audioProducerId: null,
      videoProducerId: null,
    };
    this.notifyStateChange();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[SFU] Connected');
      this.updateState({ connectionState: 'connected' });
    });

    this.socket.on('disconnect', () => {
      console.log('[SFU] Disconnected');
      this.closeAll();
      this.updateState({ connectionState: 'disconnected' });
    });

    // Handle join response
    this.socket.on('sfu:joined', async (payload: SfuJoinedPayload) => {
      console.log('[SFU] Joined room, loading device...');
      await this.loadDevice(payload.routerRtpCapabilities);
    });

    // Handle transport created
    this.socket.on('sfu:transport-created', (payload: SfuTransportCreatedPayload) => {
      console.log('[SFU] Transport created:', payload.direction);
      this.handleTransportCreated(payload);
    });

    // Handle transport connected
    this.socket.on('sfu:transport-connected', (payload: { transportId: string }) => {
      console.log('[SFU] Transport connected:', payload.transportId);
      if (this.sendTransport?.id === payload.transportId) {
        this.updateState({ sendTransportConnected: true });
      } else if (this.recvTransport?.id === payload.transportId) {
        this.updateState({ recvTransportConnected: true });
      }
    });

    // Handle producer created
    this.socket.on('sfu:producer-created', (payload: SfuProducerCreatedPayload) => {
      console.log('[SFU] Producer created:', payload.kind, payload.producerId);
      if (payload.kind === 'audio') {
        this.updateState({ audioProducerId: payload.producerId });
      } else {
        this.updateState({ videoProducerId: payload.producerId });
      }
    });

    // Handle peer joined (peer joins room)
    this.socket.on('sfu:peer-joined', (payload: SfuPeerJoinedPayload) => {
      console.log('[SFU] Peer joined:', payload.userId, payload.username);
      let peer = this.peers.get(payload.userId);
      if (!peer) {
        peer = {
          userId: payload.userId,
          username: payload.username,
          producers: new Map(),
        };
        this.peers.set(payload.userId, peer);
      } else {
        // Update username if provided
        if (payload.username) {
          peer.username = payload.username;
        }
      }
      this.peerJoinedCallbacks.forEach((callback) => {
        callback(peer);
      });
    });

    // Handle existing peers (peers already in room when this client joins)
    this.socket.on('sfu:existing-peers', (peers: SfuExistingPeersPayload[]) => {
      console.log('[SFU] Existing peers:', peers.length);
      for (const peerData of peers) {
        let peer = this.peers.get(peerData.userId);
        if (!peer) {
          peer = {
            userId: peerData.userId,
            username: peerData.username,
            producers: new Map(),
          };
          this.peers.set(peerData.userId, peer);
        } else {
          // Update username if provided
          if (peerData.username) {
            peer.username = peerData.username;
          }
        }
        this.peerJoinedCallbacks.forEach((callback) => {
          callback(peer);
        });
      }
    });

    // Handle new producer from remote peer
    this.socket.on('sfu:new-producer', (payload: SfuNewProducerPayload) => {
      console.log('[SFU] New producer:', payload.userId, payload.kind);
      void this.consumeProducer(payload);
    });

    // Handle consumer created
    this.socket.on('sfu:consumer-created', async (payload: SfuConsumerCreatedPayload) => {
      console.log('[SFU] Consumer created:', payload.kind, payload.consumerId);
      await this.handleConsumerCreated(payload);
    });

    // Handle peer left
    this.socket.on('sfu:peer-left', (payload: { userId: string }) => {
      console.log('[SFU] Peer left:', payload.userId);
      this.handlePeerLeft(payload.userId);
    });

    this.socket.on('sfu:kicked', (payload: SfuKickedPayload) => {
      console.log('[SFU] Kicked from room:', payload.roomId);
      this.kickedCallbacks.forEach((callback) => {
        callback(payload);
      });
      this.closeAll();
      this.updateState({ connectionState: 'disconnected' });
    });
  }

  // Join SFU room
  async joinRoom(payload: SfuJoinPayload): Promise<void> {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('sfu:join', payload);
  }

  // Leave SFU room
  leaveRoom(): void {
    if (!this.socket) return;
    this.socket.emit('sfu:leave');
    this.closeAll();
  }

  kickPeer(userId: string): boolean {
    if (!this.socket) {
      return false;
    }

    const payload: SfuKickPeerPayload = { userId };
    this.socket.emit('sfu:kick-peer', payload);
    return true;
  }

  // Load mediasoup device with router RTP capabilities
  private async loadDevice(routerRtpCapabilities: RtpCapabilities): Promise<void> {
    try {
      this.device = new Device();
      await this.device.load({ routerRtpCapabilities });
      this.updateState({ isDeviceLoaded: true });
      console.log('[SFU] Device loaded');

      // Create transports after device is loaded
      await this.createTransports();
    } catch (error) {
      console.error('[SFU] Failed to load device:', error);
      this.updateState({ connectionState: 'failed' });
    }
  }

  // Create send and receive transports
  private async createTransports(): Promise<void> {
    if (!this.socket) return;

    // Request send transport
    this.socket.emit('sfu:create-send-transport');

    // Request recv transport
    this.socket.emit('sfu:create-recv-transport');
  }

  // Handle transport created from server
  private async handleTransportCreated(payload: SfuTransportCreatedPayload): Promise<void> {
    if (!this.device) return;

    const transportOptions = {
      id: payload.transportId,
      iceParameters: payload.iceParameters,
      iceCandidates: payload.iceCandidates,
      dtlsParameters: payload.dtlsParameters,
    };

    if (payload.direction === 'send') {
      this.sendTransport = this.device.createSendTransport(transportOptions);
      this.updateState({ isSendTransportCreated: true });

      this.sendTransport.on('connect', async ({ dtlsParameters }: { dtlsParameters: DtlsParameters }, callback: () => void, errback: (error: Error) => void) => {
        try {
          const sendTransport = this.sendTransport;
          if (!sendTransport) {
            throw new Error('Send transport not ready');
          }

          this.socket?.emit('sfu:connect-transport', {
            transportId: sendTransport.id,
            dtlsParameters,
          });
          callback();
        } catch (error) {
          errback(error as Error);
        }
      });

      this.sendTransport.on('produce', async ({ kind, rtpParameters }: { kind: MediaKind; rtpParameters: RtpParameters }, callback: ({ id }: { id: string }) => void, errback: (error: Error) => void) => {
        try {
          const sendTransport = this.sendTransport;
          if (!sendTransport) {
            throw new Error('Send transport not ready');
          }

          this.socket?.emit('sfu:produce', {
            transportId: sendTransport.id,
            kind,
            rtpParameters,
          });

          // Wait for producer-created event
          const handler = (response: SfuProducerCreatedPayload) => {
            if (response.kind === kind) {
              this.socket?.off('sfu:producer-created', handler);
              callback({ id: response.producerId });
            }
          };
          this.socket?.on('sfu:producer-created', handler);
        } catch (error) {
          errback(error as Error);
        }
      });
    } else {
      this.recvTransport = this.device.createRecvTransport(transportOptions);

      // Replay any producers that arrived before the recv transport was ready
      if (this.pendingNewProducers.length > 0) {
        const pending = this.pendingNewProducers.splice(0);
        console.log('[SFU] Processing', pending.length, 'buffered new-producer(s)');
        for (const pendingPayload of pending) {
          void this.consumeProducer(pendingPayload);
        }
      }

      this.recvTransport.on('connect', async ({ dtlsParameters }: { dtlsParameters: DtlsParameters }, callback: () => void, errback: (error: Error) => void) => {
        try {
          const recvTransport = this.recvTransport;
          if (!recvTransport) {
            throw new Error('Receive transport not ready');
          }

          this.socket?.emit('sfu:connect-transport', {
            transportId: recvTransport.id,
            dtlsParameters,
          });
          callback();
        } catch (error) {
          errback(error as Error);
        }
      });
    }
  }

  // Produce a local track
  async produce(track: MediaStreamTrack): Promise<Producer | null> {
    if (!this.sendTransport) {
      console.error('[SFU] Send transport not ready');
      return null;
    }

    try {
      const producer = await this.sendTransport.produce({
        track,
        codecOptions: track.kind === 'video'
          ? { videoGoogleStartBitrate: 1000 }
          : undefined,
      });

      this.producers.set(producer.id, producer);
      console.log('[SFU] Produced track:', track.kind, producer.id);

      producer.on('transportclose', () => {
        this.producers.delete(producer.id);
      });

      return producer;
    } catch (error) {
      console.error('[SFU] Failed to produce track:', error);
      return null;
    }
  }

  // Consume a remote producer
  private async consumeProducer(payload: SfuNewProducerPayload): Promise<void> {
    if (!this.socket || !this.device || !this.recvTransport) {
      console.warn('[SFU] Recv transport not ready, buffering new-producer:', payload.producerId);
      this.pendingNewProducers.push(payload);
      return;
    }

    // Track peer info
    let peer = this.peers.get(payload.userId);
    if (!peer) {
      peer = {
        userId: payload.userId,
        username: payload.username || '',
        producers: new Map(),
      };
      this.peers.set(payload.userId, peer);
      // Fallback: notify peer joined for cases where sfu:peer-joined wasn't received
      this.peerJoinedCallbacks.forEach((callback) => callback(peer!));
    }
    peer.producers.set(payload.producerId, { kind: payload.kind });

    // Request to consume
    this.socket.emit('sfu:consume', {
      producerId: payload.producerId,
      rtpCapabilities: this.device.recvRtpCapabilities,
    });
  }

  // Handle consumer created from server
  private async handleConsumerCreated(payload: SfuConsumerCreatedPayload): Promise<void> {
    if (!this.recvTransport || !this.device) return;

    try {
      const consumer = await this.recvTransport.consume({
        id: payload.consumerId,
        producerId: payload.producerId,
        kind: payload.kind,
        rtpParameters: payload.rtpParameters,
      });

      this.consumers.set(consumer.id, consumer);
      console.log('[SFU] Consumer ready:', payload.kind, consumer.id);

      // Resume the consumer
      this.socket?.emit('sfu:resume-consumer', { consumerId: consumer.id });

      // Find the peer userId for this consumer
      let userId = '';
      for (const [uid, peer] of this.peers) {
        if (peer.producers.has(payload.producerId)) {
          userId = uid;
          break;
        }
      }

      // Notify track callback
      this.trackCallbacks.forEach((callback) => {
        callback(consumer.track, payload.kind, userId);
      });

      consumer.on('transportclose', () => {
        this.consumers.delete(consumer.id);
      });

      consumer.on('trackended', () => {
        consumer.close();
        this.consumers.delete(consumer.id);
      });
    } catch (error) {
      console.error('[SFU] Failed to create consumer:', error);
    }
  }

  // Handle peer left
  private handlePeerLeft(userId: string): void {
    const peer = this.peers.get(userId);
    if (peer) {
      // Close consumers for this peer
      for (const [consumerId, consumer] of this.consumers) {
        if (peer.producers.has(consumer.producerId)) {
          consumer.close();
          this.consumers.delete(consumerId);
        }
      }
      this.peers.delete(userId);
    }
    this.peerLeftCallbacks.forEach((callback) => {
      callback(userId);
    });
  }

  // Pause producer
  pauseProducer(producerId: string): void {
    const producer = this.producers.get(producerId);
    if (producer) {
      producer.pause();
      this.socket?.emit('sfu:pause-producer', { producerId });
    }
  }

  // Resume producer
  resumeProducer(producerId: string): void {
    const producer = this.producers.get(producerId);
    if (producer) {
      producer.resume();
      this.socket?.emit('sfu:resume-producer', { producerId });
    }
  }

  // Close all producers and consumers
  closeAll(): void {
    this.producers.forEach((producer) => {
      producer.close();
    });
    this.consumers.forEach((consumer) => {
      consumer.close();
    });
    this.producers.clear();
    this.consumers.clear();
    this.sendTransport?.close();
    this.recvTransport?.close();
    this.sendTransport = null;
    this.recvTransport = null;
    this.peers.clear();
    this.updateState({
      sendTransportConnected: false,
      recvTransportConnected: false,
      audioProducerId: null,
      videoProducerId: null,
    });
  }

  // Get current state
  getState(): SfuState {
    return { ...this.state };
  }

  // Get producer by kind
  getProducerByKind(kind: 'audio' | 'video'): Producer | undefined {
    for (const producer of this.producers.values()) {
      if (producer.kind === kind) {
        return producer;
      }
    }
    return undefined;
  }

  async replaceTrack(kind: 'audio' | 'video', newTrack: MediaStreamTrack | null): Promise<boolean> {
    const producer = this.getProducerByKind(kind);

    if (!producer) {
      return true;
    }

    try {
      await producer.replaceTrack({ track: newTrack });
      return true;
    } catch (error) {
      console.error(`[SFU] Failed to replace ${kind} track:`, error);
      return false;
    }
  }

  closeProducer(kind: 'audio' | 'video'): void {
    const producer = this.getProducerByKind(kind);
    if (!producer) {
      return;
    }

    producer.close();
    this.producers.delete(producer.id);
    this.socket?.emit('sfu:close-producer', { producerId: producer.id });

    if (kind === 'audio') {
      this.updateState({ audioProducerId: null });
    } else {
      this.updateState({ videoProducerId: null });
    }
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Update state and notify
  private updateState(partial: Partial<SfuState>): void {
    this.state = { ...this.state, ...partial };
    this.notifyStateChange();
  }

  private notifyStateChange(): void {
    this.stateCallbacks.forEach((callback) => {
      callback(this.getState());
    });
  }

  // Event subscriptions
  onStateChange(callback: SfuStateCallback): () => void {
    this.stateCallbacks.add(callback);
    callback(this.getState());
    return () => this.stateCallbacks.delete(callback);
  }

  onTrack(callback: SfuTrackCallback): () => void {
    this.trackCallbacks.add(callback);
    return () => this.trackCallbacks.delete(callback);
  }

  onPeerJoined(callback: SfuPeerCallback): () => void {
    this.peerJoinedCallbacks.add(callback);
    return () => this.peerJoinedCallbacks.delete(callback);
  }

  onPeerLeft(callback: (userId: string) => void): () => void {
    this.peerLeftCallbacks.add(callback);
    return () => this.peerLeftCallbacks.delete(callback);
  }

  onKicked(callback: (payload: SfuKickedPayload) => void): () => void {
    this.kickedCallbacks.add(callback);
    return () => this.kickedCallbacks.delete(callback);
  }

  // Quality stats collection
  onQualityStats(callback: QualityStatsCallback): () => void {
    this.qualityStatsCallbacks.add(callback);
    return () => this.qualityStatsCallbacks.delete(callback);
  }

  startStatsCollection(intervalMs: number = 2000): void {
    if (this.statsInterval) {
      return;
    }

    this.statsInterval = setInterval(() => {
      this.collectStats();
    }, intervalMs);
  }

  stopStatsCollection(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  private async collectStats(): Promise<void> {
    if (!this.recvTransport || this.consumers.size === 0) {
      return;
    }

    const statsMap = new Map<string, PeerQualityStats>();

    for (const [consumerId, consumer] of this.consumers) {
      try {
        const stats = await this.getConsumerStats(consumer);
        if (!stats) continue;

        // Find the userId for this consumer
        let userId = '';
        for (const [uid, peer] of this.peers) {
          if (peer.producers.has(consumer.producerId)) {
            userId = uid;
            break;
          }
        }

        if (!userId) continue;

        // Merge stats for the same user (video + audio)
        const existing = statsMap.get(userId);
        if (existing) {
          // Prefer video stats for quality display, merge with existing
          if (consumer.kind === 'video') {
            existing.stats = {
              ...existing.stats,
              bitrate: stats.bitrate || existing.stats.bitrate,
              width: stats.width || existing.stats.width,
              height: stats.height || existing.stats.height,
              fps: stats.fps || existing.stats.fps,
              rtt: stats.rtt || existing.stats.rtt,
              packetLoss: stats.packetLoss || existing.stats.packetLoss,
            };
            existing.score = calculateQualityScore(existing.stats);
          }
        } else {
          const score = calculateQualityScore(stats);
          statsMap.set(userId, { userId, stats, score });
        }
      } catch (error) {
        console.error('[SFU] Failed to get stats for consumer:', consumerId, error);
      }
    }

    if (statsMap.size > 0) {
      this.qualityStatsCallbacks.forEach((callback) => {
        callback(statsMap);
      });
    }
  }

  private async getConsumerStats(consumer: Consumer): Promise<QualityStats | null> {
    try {
      const transportStats = await this.recvTransport!.getStats();
      let rtt = 0;
      let packetLoss = 0;

      for (const stat of transportStats.values()) {
        if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
          rtt = stat.currentRoundTripTime ? stat.currentRoundTripTime * 1000 : 0;
          if (stat.packetsReceived !== undefined && stat.packetsLost !== undefined) {
            const total = stat.packetsReceived + stat.packetsLost;
            packetLoss = total > 0 ? (stat.packetsLost / total) * 100 : 0;
          }
          break;
        }
      }

      // Get video-specific stats if available
      let bitrate = 0;
      let width = 0;
      let height = 0;
      let fps = 0;

      if (consumer.kind === 'video') {
        const consumerStats = await consumer.getStats();
        for (const stat of consumerStats.values()) {
          if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
            bitrate = stat.bitrate ? stat.bitrate / 1000 : 0; // Convert to kbps
            width = stat.frameWidth || 0;
            height = stat.frameHeight || 0;
            fps = stat.framesPerSecond || 0;
            break;
          }
        }
      } else {
        // For audio, just get bitrate
        const consumerStats = await consumer.getStats();
        for (const stat of consumerStats.values()) {
          if (stat.type === 'inbound-rtp' && stat.kind === 'audio') {
            bitrate = stat.bitrate ? stat.bitrate / 1000 : 0;
            break;
          }
        }
      }

      return { bitrate, packetLoss, rtt, width, height, fps };
    } catch (error) {
      console.error('[SFU] Error getting consumer stats:', error);
      return null;
    }
  }
}

export const sfuManager = new SfuManager();
