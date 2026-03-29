/**
 * SFU manager facade.
 * Composes connection, event router, stats collector into a unified interface.
 */

import { Device } from 'mediasoup-client';
import type {
  Consumer,
  DtlsParameters,
  MediaKind,
  Producer,
  RtpCapabilities,
  RtpParameters,
  Transport,
} from 'mediasoup-client/types';
import { SfuConnection } from './connection';
import { SfuEventRouter, type SfuEventHandlers } from './event-router';
import { SfuStatsCollector } from './stats-collector';
import type { ISfuManager } from './interfaces';
import type {
  SfuState,
  SfuJoinedPayload,
  SfuTransportCreatedPayload,
  SfuNewProducerPayload,
  SfuConsumerCreatedPayload,
  SfuProducerCreatedPayload,
  SfuJoinPayload,
  SfuKickedPayload,
  SfuRoomEndedPayload,
  SfuPeerInfo,
  SfuPeerJoinedPayload,
  SfuExistingPeersPayload,
  SfuProducerStateChangedPayload,
  QualityStatsCallback,
  PeerQualityStats,
  SfuStateCallback,
  SfuTrackCallback,
  SfuPeerCallback,
  SfuProducerStateCallback,
} from './types';

/**
 * Facade for SFU management.
 * Implements ISfuManager by composing focused modules.
 */
export class SfuManager implements ISfuManager {
  private connection = new SfuConnection();
  private statsCollector: SfuStatsCollector;

  // Internal mediasoup state
  private device: Device | null = null;
  private sendTransport: Transport | null = null;
  private recvTransport: Transport | null = null;
  private producers = new Map<string, Producer>();
  private consumers = new Map<string, Consumer>();
  private peers = new Map<string, SfuPeerInfo>();
  private pendingNewProducers: SfuNewProducerPayload[] = [];
  private producingInProgress = new Map<string, Promise<Producer | null>>();

  // State and callbacks
  private state: SfuState = {
    connectionState: 'disconnected',
    isDeviceLoaded: false,
    isSendTransportCreated: false,
    sendTransportConnected: false,
    recvTransportConnected: false,
    audioProducerId: null,
    videoProducerId: null,
  };
  private stateCallbacks = new Set<SfuStateCallback>();
  private trackCallbacks = new Set<SfuTrackCallback>();
  private peerJoinedCallbacks = new Set<SfuPeerCallback>();
  private peerLeftCallbacks = new Set<(userId: string) => void>();
  private kickedCallbacks = new Set<(payload: SfuKickedPayload) => void>();
  private roomEndedCallbacks = new Set<(payload: SfuRoomEndedPayload) => void>();
  private producerStateCallbacks = new Set<SfuProducerStateCallback>();

  // Event router
  private eventRouter = new SfuEventRouter(
    () => this.connection.getSocket(),
    this.createEventHandlers()
  );

  constructor() {
    this.statsCollector = new SfuStatsCollector(
      () => this.recvTransport,
      () => this.consumers.entries(),
      (producerId) => this.findPeerForProducer(producerId)
    );
  }

  private createEventHandlers(): SfuEventHandlers {
    return {
      onConnected: () => this.handleConnected(),
      onDisconnected: () => this.handleDisconnected(),
      onJoined: (p) => this.handleJoined(p),
      onTransportCreated: (p) => this.handleTransportCreated(p),
      onTransportConnected: (p) => this.handleTransportConnected(p),
      onProducerCreated: (p) => this.handleProducerCreated(p),
      onPeerJoined: (p) => this.handlePeerJoined(p),
      onExistingPeers: (p) => this.handleExistingPeers(p),
      onNewProducer: (p) => this.handleNewProducer(p),
      onConsumerCreated: (p) => this.handleConsumerCreated(p),
      onProducerStateChanged: (p) => this.handleProducerStateChanged(p),
      onPeerLeft: (p) => this.handlePeerLeft(p),
      onKicked: (p) => this.handleKicked(p),
      onRoomEnded: (p) => this.handleRoomEnded(p),
    };
  }

  // ISfuConnection
  connect(): void {
    if (this.connection.isConnected()) return;
    this.updateState({ connectionState: 'connecting' });
    this.connection.connect();
    this.eventRouter.setup();
  }

  disconnect(): void {
    this.statsCollector.stop();
    this.eventRouter.teardown();
    this.closeAll();
    this.connection.disconnect();
    this.resetState();
  }

  isConnected(): boolean {
    return this.connection.isConnected();
  }

  getSocket() {
    return this.connection.getSocket();
  }

  // ISfuRoomMembership
  async joinRoom(payload: SfuJoinPayload): Promise<void> {
    const socket = this.connection.getSocket();
    if (!socket) {
      throw new Error('Socket not connected');
    }
    socket.emit('sfu:join', payload);
  }

  leaveRoom(): void {
    const socket = this.connection.getSocket();
    if (socket) {
      socket.emit('sfu:leave');
    }
    this.closeAll();
  }

  kickPeer(userId: string): boolean {
    const socket = this.connection.getSocket();
    if (!socket) return false;
    socket.emit('sfu:kick-peer', { userId });
    return true;
  }

  onKicked(callback: (payload: SfuKickedPayload) => void): () => void {
    this.kickedCallbacks.add(callback);
    return () => this.kickedCallbacks.delete(callback);
  }

  onRoomEnded(callback: (payload: SfuRoomEndedPayload) => void): () => void {
    this.roomEndedCallbacks.add(callback);
    return () => this.roomEndedCallbacks.delete(callback);
  }

  // ISfuProducerManager
  async produce(track: MediaStreamTrack): Promise<Producer | null> {
    if (!this.sendTransport) {
      console.error('[SFU] Send transport not ready');
      return null;
    }

    const kind = track.kind;

    // Guard: if a producer for this kind already exists, skip
    if (this.getProducerByKind(kind as 'audio' | 'video')) {
      console.warn('[SFU] Producer already exists for kind:', kind);
      return this.getProducerByKind(kind as 'audio' | 'video') ?? null;
    }

    // Guard: if a produce call for this kind is already in-flight, return
    // the pending promise to deduplicate concurrent callers
    const pending = this.producingInProgress.get(kind);
    if (pending) {
      console.warn('[SFU] Produce already in-flight for kind:', kind);
      return pending;
    }

    const producePromise = this.doProduceTrack(track);
    this.producingInProgress.set(kind, producePromise);

    try {
      return await producePromise;
    } finally {
      this.producingInProgress.delete(kind);
    }
  }

  private async doProduceTrack(track: MediaStreamTrack): Promise<Producer | null> {
    if (!this.sendTransport) return null;

    try {
      const producer = await this.sendTransport.produce({
        track,
        codecOptions:
          track.kind === 'video'
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

  pauseProducer(producerId: string): void {
    const producer = this.producers.get(producerId);
    if (producer) {
      producer.pause();
      this.connection.getSocket()?.emit('sfu:pause-producer', { producerId });
    }
  }

  resumeProducer(producerId: string): void {
    const producer = this.producers.get(producerId);
    if (producer) {
      producer.resume();
      this.connection.getSocket()?.emit('sfu:resume-producer', { producerId });
    }
  }

  closeProducer(kind: 'audio' | 'video'): void {
    const producer = this.getProducerByKind(kind);
    if (!producer) return;

    producer.close();
    this.producers.delete(producer.id);
    this.connection
      .getSocket()
      ?.emit('sfu:close-producer', { producerId: producer.id });

    if (kind === 'audio') {
      this.updateState({ audioProducerId: null });
    } else {
      this.updateState({ videoProducerId: null });
    }
  }

  async replaceTrack(
    kind: 'audio' | 'video',
    newTrack: MediaStreamTrack | null
  ): Promise<boolean> {
    const producer = this.getProducerByKind(kind);
    if (!producer) return true;

    try {
      await producer.replaceTrack({ track: newTrack });
      return true;
    } catch (error) {
      console.error(`[SFU] Failed to replace ${kind} track:`, error);
      return false;
    }
  }

  getProducerByKind(kind: 'audio' | 'video'): Producer | undefined {
    for (const producer of this.producers.values()) {
      if (producer.kind === kind) {
        return producer;
      }
    }
    return undefined;
  }

  // ISfuPeerRegistry
  getPeers(): Map<string, SfuPeerInfo> {
    return new Map(this.peers);
  }

  getPeer(userId: string): SfuPeerInfo | undefined {
    return this.peers.get(userId);
  }

  onPeerJoined(callback: SfuPeerCallback): () => void {
    this.peerJoinedCallbacks.add(callback);
    return () => this.peerJoinedCallbacks.delete(callback);
  }

  onPeerLeft(callback: (userId: string) => void): () => void {
    this.peerLeftCallbacks.add(callback);
    return () => this.peerLeftCallbacks.delete(callback);
  }

  // ISfuStateNotifier
  getState(): SfuState {
    return { ...this.state };
  }

  onStateChange(callback: SfuStateCallback): () => void {
    this.stateCallbacks.add(callback);
    callback(this.getState());
    return () => this.stateCallbacks.delete(callback);
  }

  onTrack(callback: SfuTrackCallback): () => void {
    this.trackCallbacks.add(callback);
    return () => this.trackCallbacks.delete(callback);
  }

  onProducerStateChange(callback: SfuProducerStateCallback): () => void {
    this.producerStateCallbacks.add(callback);
    return () => this.producerStateCallbacks.delete(callback);
  }

  // Stats methods
  startStatsCollection(intervalMs?: number): void {
    this.statsCollector.start(intervalMs);
  }

  stopStatsCollection(): void {
    this.statsCollector.stop();
  }

  onQualityStats(callback: QualityStatsCallback): () => void {
    return this.statsCollector.onStats(callback);
  }

  getStats(): Map<string, PeerQualityStats> {
    return new Map();
  }

  // Event handlers
  private handleConnected(): void {
    console.log('[SFU] Connected');
    this.updateState({ connectionState: 'connected' });
  }

  private handleDisconnected(): void {
    console.log('[SFU] Disconnected');
    this.closeAll();
    this.updateState({ connectionState: 'disconnected' });
  }

  private async handleJoined(payload: SfuJoinedPayload): Promise<void> {
    console.log('[SFU] Joined room, loading device...');
    await this.loadDevice(payload.routerRtpCapabilities);
  }

  private async handleTransportCreated(
    payload: SfuTransportCreatedPayload
  ): Promise<void> {
    if (!this.device) return;

    const transportOptions = {
      id: payload.transportId,
      iceParameters: payload.iceParameters,
      iceCandidates: payload.iceCandidates,
      dtlsParameters: payload.dtlsParameters,
      iceServers: payload.iceServers,
    };

    // TODO(TASK-072): remove debug log after verifying ICE servers flow
    console.log('[SFU] Transport created:', payload.direction, {
      iceServers: payload.iceServers,
      transportId: payload.transportId,
    });

    if (payload.direction === 'send') {
      this.sendTransport = this.device.createSendTransport(transportOptions);
      this.updateState({ isSendTransportCreated: true });

      this.sendTransport.on(
        'connect',
        async (
          { dtlsParameters }: { dtlsParameters: DtlsParameters },
          callback: () => void,
          errback: (error: Error) => void
        ) => {
          try {
            const sendTransport = this.sendTransport;
            if (!sendTransport) {
              throw new Error('Send transport not ready');
            }

            this.connection
              .getSocket()
              ?.emit('sfu:connect-transport', {
                transportId: sendTransport.id,
                dtlsParameters,
              });
            callback();
          } catch (error) {
            errback(error as Error);
          }
        }
      );

      this.sendTransport.on(
        'produce',
        async (
          {
            kind,
            rtpParameters,
          }: { kind: MediaKind; rtpParameters: RtpParameters },
          callback: ({ id }: { id: string }) => void,
          errback: (error: Error) => void
        ) => {
          try {
            const sendTransport = this.sendTransport;
            if (!sendTransport) {
              throw new Error('Send transport not ready');
            }

            this.connection.getSocket()?.emit('sfu:produce', {
              transportId: sendTransport.id,
              kind,
              rtpParameters,
            });

            const handler = (response: SfuProducerCreatedPayload) => {
              if (response.kind === kind) {
                this.connection.getSocket()?.off('sfu:producer-created', handler);
                callback({ id: response.producerId });
              }
            };
            this.connection.getSocket()?.on('sfu:producer-created', handler);
          } catch (error) {
            errback(error as Error);
          }
        }
      );
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

      this.recvTransport.on(
        'connect',
        async (
          { dtlsParameters }: { dtlsParameters: DtlsParameters },
          callback: () => void,
          errback: (error: Error) => void
        ) => {
          try {
            const recvTransport = this.recvTransport;
            if (!recvTransport) {
              throw new Error('Receive transport not ready');
            }

            this.connection
              .getSocket()
              ?.emit('sfu:connect-transport', {
                transportId: recvTransport.id,
                dtlsParameters,
              });
            callback();
          } catch (error) {
            errback(error as Error);
          }
        }
      );
    }
  }

  private handleTransportConnected(payload: { transportId: string }): void {
    console.log('[SFU] Transport connected:', payload.transportId);
    if (this.sendTransport?.id === payload.transportId) {
      this.updateState({ sendTransportConnected: true });
    } else if (this.recvTransport?.id === payload.transportId) {
      this.updateState({ recvTransportConnected: true });
    }
  }

  private handleProducerCreated(payload: SfuProducerCreatedPayload): void {
    console.log('[SFU] Producer created:', payload.kind, payload.producerId);
    if (payload.kind === 'audio') {
      this.updateState({ audioProducerId: payload.producerId });
    } else {
      this.updateState({ videoProducerId: payload.producerId });
    }
  }

  private handlePeerJoined(payload: SfuPeerJoinedPayload): void {
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
      if (payload.username) {
        peer.username = payload.username;
      }
    }
    this.peerJoinedCallbacks.forEach((callback) => callback(peer!));
  }

  private handleExistingPeers(peers: SfuExistingPeersPayload[]): void {
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
        if (peerData.username) {
          peer.username = peerData.username;
        }
      }
      this.peerJoinedCallbacks.forEach((callback) => callback(peer!));
    }
  }

  private handleNewProducer(payload: SfuNewProducerPayload): void {
    console.log('[SFU] New producer:', payload.userId, payload.kind);
    void this.consumeProducer(payload);
  }

  private async handleConsumerCreated(
    payload: SfuConsumerCreatedPayload
  ): Promise<void> {
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
      this.connection
        .getSocket()
        ?.emit('sfu:resume-consumer', { consumerId: consumer.id });

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

      const producerInfo = this.peers.get(userId)?.producers.get(payload.producerId);
      if (producerInfo?.paused) {
        this.producerStateCallbacks.forEach((callback) => {
          callback({
            producerId: payload.producerId,
            kind: payload.kind,
            userId,
            paused: true,
          });
        });
      }

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

  private handleProducerStateChanged(payload: SfuProducerStateChangedPayload): void {
    console.log('[SFU] Producer state changed:', payload.userId, payload.kind, payload.paused ? 'paused' : 'resumed');
    this.producerStateCallbacks.forEach((callback) => callback(payload));
  }

  private handlePeerLeft(payload: { userId: string }): void {
    console.log('[SFU] Peer left:', payload.userId);
    const peer = this.peers.get(payload.userId);
    if (peer) {
      // Close consumers for this peer
      for (const [consumerId, consumer] of this.consumers) {
        if (peer.producers.has(consumer.producerId)) {
          consumer.close();
          this.consumers.delete(consumerId);
        }
      }
      this.peers.delete(payload.userId);
    }
    this.peerLeftCallbacks.forEach((callback) => callback(payload.userId));
  }

  private handleKicked(payload: SfuKickedPayload): void {
    console.log('[SFU] Kicked from room:', payload.roomId);
    this.kickedCallbacks.forEach((callback) => callback(payload));
    this.closeAll();
    this.updateState({ connectionState: 'disconnected' });
  }

  private handleRoomEnded(payload: SfuRoomEndedPayload): void {
    console.log('[SFU] Room ended:', payload.roomId);
    this.roomEndedCallbacks.forEach((callback) => callback(payload));
    this.closeAll();
    this.updateState({ connectionState: 'disconnected' });
  }

  // Private helpers
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

  private async createTransports(): Promise<void> {
    const socket = this.connection.getSocket();
    if (!socket) return;

    socket.emit('sfu:create-send-transport');
    socket.emit('sfu:create-recv-transport');
  }

  private async consumeProducer(payload: SfuNewProducerPayload): Promise<void> {
    if (!this.connection.getSocket() || !this.device || !this.recvTransport) {
      console.warn(
        '[SFU] Recv transport not ready, buffering new-producer:',
        payload.producerId
      );
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
      this.peerJoinedCallbacks.forEach((callback) => callback(peer!));
    }
    peer.producers.set(payload.producerId, { kind: payload.kind, paused: payload.paused });

    // Request to consume
    this.connection.getSocket()!.emit('sfu:consume', {
      producerId: payload.producerId,
      rtpCapabilities: this.device.recvRtpCapabilities,
    });
  }

  private findPeerForProducer(producerId: string): string | undefined {
    for (const [userId, peer] of this.peers) {
      if (peer.producers.has(producerId)) {
        return userId;
      }
    }
    return undefined;
  }

  private closeAll(): void {
    this.producers.forEach((producer) => producer.close());
    this.consumers.forEach((consumer) => consumer.close());
    this.producers.clear();
    this.consumers.clear();
    this.producingInProgress.clear();
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

  private resetState(): void {
    this.device = null;
    this.sendTransport = null;
    this.recvTransport = null;
    this.producers.clear();
    this.consumers.clear();
    this.producingInProgress.clear();
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

  private updateState(partial: Partial<SfuState>): void {
    this.state = { ...this.state, ...partial };
    this.notifyStateChange();
  }

  private notifyStateChange(): void {
    this.stateCallbacks.forEach((callback) => callback(this.getState()));
  }
}

/** Singleton instance for backward compatibility */
export const sfuManager = new SfuManager();
