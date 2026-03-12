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
} from './types';

const SOCKET_URL = (import.meta.env as { VITE_SOCKET_URL?: string }).VITE_SOCKET_URL ?? 'http://localhost:3000';

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
    this.state = {
      connectionState: 'disconnected',
      isDeviceLoaded: false,
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

    // Handle new producer from peer
    this.socket.on('sfu:new-producer', async (payload: SfuNewProducerPayload) => {
      console.log('[SFU] New producer from peer:', payload.userId, payload.kind);
      const existingPeer = this.peers.get(payload.userId);
      if (!existingPeer) {
        const peer = {
          userId: payload.userId,
          username: payload.username,
          producers: new Map<string, { kind: 'audio' | 'video' }>(),
        };
        this.peers.set(payload.userId, peer);
        this.peerJoinedCallbacks.forEach((callback) => {
          callback(peer);
        });
      } else if (payload.username && existingPeer.username !== payload.username) {
        existingPeer.username = payload.username;
        this.peerJoinedCallbacks.forEach((callback) => {
          callback(existingPeer);
        });
      }

      await this.consumeProducer(payload);
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
      console.error('[SFU] Not ready to consume');
      return;
    }

    // Track peer info
    let peer = this.peers.get(payload.userId);
    if (!peer) {
      peer = {
        userId: payload.userId,
        username: '',
        producers: new Map(),
      };
      this.peers.set(payload.userId, peer);
    }
    peer.producers.set(payload.producerId, { kind: payload.kind });

    // Request to consume
    this.socket.emit('sfu:consume', {
      producerId: payload.producerId,
      rtpCapabilities: this.device.rtpCapabilities,
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

  async replaceTrack(kind: 'audio' | 'video', newTrack: MediaStreamTrack): Promise<boolean> {
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
}

export const sfuManager = new SfuManager();
