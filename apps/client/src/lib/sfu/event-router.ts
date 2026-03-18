/**
 * SFU event router.
 * Routes socket events to handler methods.
 */

import type { Socket } from 'socket.io-client';
import type {
  SfuJoinedPayload,
  SfuTransportCreatedPayload,
  SfuNewProducerPayload,
  SfuConsumerCreatedPayload,
  SfuProducerCreatedPayload,
  SfuPeerJoinedPayload,
  SfuKickedPayload,
  SfuRoomEndedPayload,
} from './types';
import type { SfuExistingPeersPayload } from './types';

/**
 * Handler interface for SFU socket events.
 */
export interface SfuEventHandlers {
  onConnected(): void;
  onDisconnected(): void;
  onJoined(payload: SfuJoinedPayload): Promise<void>;
  onTransportCreated(payload: SfuTransportCreatedPayload): Promise<void>;
  onTransportConnected(payload: { transportId: string }): void;
  onProducerCreated(payload: SfuProducerCreatedPayload): void;
  onPeerJoined(payload: SfuPeerJoinedPayload): void;
  onExistingPeers(payload: SfuExistingPeersPayload[]): void;
  onNewProducer(payload: SfuNewProducerPayload): void;
  onConsumerCreated(payload: SfuConsumerCreatedPayload): Promise<void>;
  onPeerLeft(payload: { userId: string }): void;
  onKicked(payload: SfuKickedPayload): void;
  onRoomEnded(payload: SfuRoomEndedPayload): void;
}

/**
 * Routes socket events to handler methods.
 */
export class SfuEventRouter {
  private getSocket: () => Socket | null;
  private handlers: SfuEventHandlers;

  constructor(getSocket: () => Socket | null, handlers: SfuEventHandlers) {
    this.getSocket = getSocket;
    this.handlers = handlers;
  }

  /**
   * Set up all event listeners.
   */
  setup(): void {
    const socket = this.getSocket();
    if (!socket) return;

    socket.on('connect', () => this.handlers.onConnected());
    socket.on('disconnect', () => this.handlers.onDisconnected());
    socket.on('sfu:joined', (payload: SfuJoinedPayload) =>
      this.handlers.onJoined(payload)
    );
    socket.on('sfu:transport-created', (payload: SfuTransportCreatedPayload) =>
      this.handlers.onTransportCreated(payload)
    );
    socket.on('sfu:transport-connected', (payload: { transportId: string }) =>
      this.handlers.onTransportConnected(payload)
    );
    socket.on('sfu:producer-created', (payload: SfuProducerCreatedPayload) =>
      this.handlers.onProducerCreated(payload)
    );
    socket.on('sfu:peer-joined', (payload: SfuPeerJoinedPayload) =>
      this.handlers.onPeerJoined(payload)
    );
    socket.on('sfu:existing-peers', (payload: SfuExistingPeersPayload[]) =>
      this.handlers.onExistingPeers(payload)
    );
    socket.on('sfu:new-producer', (payload: SfuNewProducerPayload) =>
      this.handlers.onNewProducer(payload)
    );
    socket.on('sfu:consumer-created', (payload: SfuConsumerCreatedPayload) =>
      this.handlers.onConsumerCreated(payload)
    );
    socket.on('sfu:peer-left', (payload: { userId: string }) =>
      this.handlers.onPeerLeft(payload)
    );
    socket.on('sfu:kicked', (payload: SfuKickedPayload) =>
      this.handlers.onKicked(payload)
    );
    socket.on('sfu:room-ended', (payload: SfuRoomEndedPayload) =>
      this.handlers.onRoomEnded(payload)
    );
  }

  /**
   * Remove all event listeners.
   */
  teardown(): void {
    const socket = this.getSocket();
    if (!socket) return;

    socket.removeAllListeners();
  }
}
