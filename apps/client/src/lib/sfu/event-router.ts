/**
 * SFU event router.
 * Routes socket events to handler methods.
 */

import type { Socket } from "socket.io-client";

import type {
  SfuJoinedPayload,
  SfuTransportCreatedPayload,
  SfuNewProducerPayload,
  SfuConsumerCreatedPayload,
  SfuProducerCreatedPayload,
  SfuPeerJoinedPayload,
  SfuKickedPayload,
  SfuRoomEndedPayload,
  SfuProducerStateChangedPayload,
  SfuProduceErrorPayload,
  SfuScreenShareStartedPayload,
  SfuScreenShareStoppedPayload,
  SfuConsumerClosedPayload,
  SfuGuestJoinRequestPayload,
} from "./types";
import type { SfuExistingPeersPayload } from "./types";

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
  onProduceError(payload: SfuProduceErrorPayload): void;
  onPeerJoined(payload: SfuPeerJoinedPayload): void;
  onExistingPeers(payload: SfuExistingPeersPayload[]): void;
  onNewProducer(payload: SfuNewProducerPayload): void;
  onConsumerCreated(payload: SfuConsumerCreatedPayload): Promise<void>;
  onConsumerClosed(payload: SfuConsumerClosedPayload): void;
  onProducerStateChanged(payload: SfuProducerStateChangedPayload): void;
  onPeerLeft(payload: { userId: string }): void;
  onKicked(payload: SfuKickedPayload): void;
  onRoomEnded(payload: SfuRoomEndedPayload): void;
  onReconnectFailed(): void;
  onScreenShareStarted(payload: SfuScreenShareStartedPayload): void;
  onScreenShareStopped(payload: SfuScreenShareStoppedPayload): void;
  onGuestJoinRequest(payload: SfuGuestJoinRequestPayload): void;
}

/** A registered socket listener that can be selectively removed. */
type RegisteredListener = { event: string; handler: (...args: unknown[]) => unknown };

/**
 * Routes socket events to handler methods.
 */
export class SfuEventRouter {
  private getSocket: () => Socket | null;
  private handlers: SfuEventHandlers;
  private registeredListeners: RegisteredListener[] = [];

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

    const register = (event: string, handler: (...args: unknown[]) => unknown) => {
      socket.on(event, handler);
      this.registeredListeners.push({ event, handler });
    };

    register("connect", () => this.handlers.onConnected());
    register("disconnect", () => this.handlers.onDisconnected());
    register("sfu:joined", (payload: unknown) =>
      this.handlers.onJoined(payload as SfuJoinedPayload),
    );
    register("sfu:transport-created", (payload: unknown) =>
      this.handlers.onTransportCreated(payload as SfuTransportCreatedPayload),
    );
    register("sfu:transport-connected", (payload: unknown) =>
      this.handlers.onTransportConnected(payload as { transportId: string }),
    );
    register("sfu:producer-created", (payload: unknown) =>
      this.handlers.onProducerCreated(payload as SfuProducerCreatedPayload),
    );
    register("sfu:produce-error", (payload: unknown) =>
      this.handlers.onProduceError(payload as SfuProduceErrorPayload),
    );
    register("sfu:peer-joined", (payload: unknown) =>
      this.handlers.onPeerJoined(payload as SfuPeerJoinedPayload),
    );
    register("sfu:existing-peers", (payload: unknown) =>
      this.handlers.onExistingPeers(payload as SfuExistingPeersPayload[]),
    );
    register("sfu:new-producer", (payload: unknown) =>
      this.handlers.onNewProducer(payload as SfuNewProducerPayload),
    );
    register("sfu:consumer-created", (payload: unknown) =>
      this.handlers.onConsumerCreated(payload as SfuConsumerCreatedPayload),
    );
    register("sfu:consumer-closed", (payload: unknown) =>
      this.handlers.onConsumerClosed(payload as SfuConsumerClosedPayload),
    );
    register("sfu:producer-state-changed", (payload: unknown) =>
      this.handlers.onProducerStateChanged(payload as SfuProducerStateChangedPayload),
    );
    register("sfu:peer-left", (payload: unknown) =>
      this.handlers.onPeerLeft(payload as { userId: string }),
    );
    register("sfu:kicked", (payload: unknown) =>
      this.handlers.onKicked(payload as SfuKickedPayload),
    );
    register("sfu:room-ended", (payload: unknown) =>
      this.handlers.onRoomEnded(payload as SfuRoomEndedPayload),
    );
    register("sfu:screen-share-started", (payload: unknown) =>
      this.handlers.onScreenShareStarted(payload as SfuScreenShareStartedPayload),
    );
    register("sfu:screen-share-stopped", (payload: unknown) =>
      this.handlers.onScreenShareStopped(payload as SfuScreenShareStoppedPayload),
    );
    register("sfu:guest-join-request", (payload: unknown) =>
      this.handlers.onGuestJoinRequest(payload as SfuGuestJoinRequestPayload),
    );
    register("reconnect_failed", () => this.handlers.onReconnectFailed());
  }

  /**
   * Remove only the listeners registered by this router.
   * Does not affect any other listeners on the socket.
   */
  teardown(): void {
    const socket = this.getSocket();
    if (!socket) {
      this.registeredListeners = [];
      return;
    }

    for (const { event, handler } of this.registeredListeners) {
      socket.off(event, handler);
    }
    this.registeredListeners = [];
  }
}
