/**
 * SFU manager facade.
 * Composes connection, event router, stats collector into a unified interface.
 */

import { Device } from "mediasoup-client";
import type {
  Consumer,
  DtlsParameters,
  MediaKind,
  Producer,
  RtpCapabilities,
  RtpEncodingParameters,
  RtpParameters,
  Transport,
} from "mediasoup-client/types";

import { SfuConnection } from "./connection";
import { SfuEventRouter, type SfuEventHandlers } from "./event-router";
import type { ISfuManager } from "./interfaces";
import { SfuStatsCollector } from "./stats-collector";
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
  SimulcastSpatialLayer,
  SfuProduceErrorCode,
  SfuMediaSource,
  SfuConsumerClosedPayload,
  SfuScreenShareStoppedPayload,
  SfuScreenShareStoppedCallback,
} from "./types";
import { SfuProduceError } from "./types";

/**
 * Simulcast encoding layers sent to the SFU for video producers.
 * Mirrors SIMULCAST_ENCODINGS in apps/server/src/sfu/config/mediasoup.config.ts.
 */
const SIMULCAST_ENCODINGS: RtpEncodingParameters[] = [
  { rid: "low", maxBitrate: 150_000, scaleResolutionDownBy: 4, maxFramerate: 15 },
  { rid: "mid", maxBitrate: 500_000, scaleResolutionDownBy: 2, maxFramerate: 24 },
  { rid: "high", maxBitrate: 2_000_000 },
];

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
  private pendingProduceRequests = new Map<
    string,
    { resolve: (id: string) => void; reject: (error: Error) => void; source: SfuMediaSource }
  >();
  private localUserId: string | null = null;

  // State and callbacks
  private state: SfuState = {
    connectionState: "disconnected",
    isDeviceLoaded: false,
    isSendTransportCreated: false,
    sendTransportConnected: false,
    recvTransportConnected: false,
    audioProducerId: null,
    videoProducerId: null,
    screenProducerId: null,
    isScreenShareBlocked: false,
  };
  private stateCallbacks = new Set<SfuStateCallback>();
  private trackCallbacks = new Set<SfuTrackCallback>();
  private peerJoinedCallbacks = new Set<SfuPeerCallback>();
  private peerLeftCallbacks = new Set<(userId: string) => void>();
  private kickedCallbacks = new Set<(payload: SfuKickedPayload) => void>();
  private roomEndedCallbacks = new Set<(payload: SfuRoomEndedPayload) => void>();
  private producerStateCallbacks = new Set<SfuProducerStateCallback>();
  private produceErrorCallbacks = new Set<(code: SfuProduceErrorCode) => void>();
  private screenShareStoppedCallbacks = new Set<SfuScreenShareStoppedCallback>();

  // Event router
  private eventRouter = new SfuEventRouter(
    () => this.connection.getSocket(),
    this.createEventHandlers(),
  );

  constructor() {
    this.statsCollector = new SfuStatsCollector(
      () => this.recvTransport,
      () => this.consumers.entries(),
      (producerId) => this.findPeerForProducer(producerId),
    );
  }

  private createEventHandlers(): SfuEventHandlers {
    return {
      onConnected: () => this.handleConnected(),
      onDisconnected: () => this.handleDisconnected(),
      onReconnectFailed: () => this.handleReconnectFailed(),
      onJoined: (p) => this.handleJoined(p),
      onTransportCreated: (p) => this.handleTransportCreated(p),
      onTransportConnected: (p) => this.handleTransportConnected(p),
      onProducerCreated: (p) => this.handleProducerCreated(p),
      onProduceError: (p) => this.handleProduceError(p),
      onPeerJoined: (p) => this.handlePeerJoined(p),
      onExistingPeers: (p) => this.handleExistingPeers(p),
      onNewProducer: (p) => this.handleNewProducer(p),
      onConsumerCreated: (p) => this.handleConsumerCreated(p),
      onConsumerClosed: (p) => this.handleConsumerClosed(p),
      onProducerStateChanged: (p) => this.handleProducerStateChanged(p),
      onPeerLeft: (p) => this.handlePeerLeft(p),
      onKicked: (p) => this.handleKicked(p),
      onRoomEnded: (p) => this.handleRoomEnded(p),
      onScreenShareStarted: (p) => this.handleScreenShareStarted(p),
      onScreenShareStopped: (p) => this.handleScreenShareStopped(p),
    };
  }

  // ISfuConnection
  connect(): void {
    // Guard against duplicate calls while already connecting or connected.
    // socket.io's on() appends listeners, so calling teardown+setup twice
    // would double-register every handler.
    if (this.connection.isConnected() || this.state.connectionState === "connecting") return;
    // Tear down before re-registering to clear any stale listeners left from a
    // previous cycle (e.g. after disconnect → reconnect).
    this.eventRouter.teardown();
    this.updateState({ connectionState: "connecting" });
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
      throw new Error("Socket not connected");
    }
    this.localUserId = payload.userId;
    socket.emit("sfu:join", payload);
  }

  leaveRoom(): void {
    const socket = this.connection.getSocket();
    if (socket) {
      socket.emit("sfu:leave");
    }
    this.closeAll();
  }

  kickPeer(userId: string): boolean {
    const socket = this.connection.getSocket();
    if (!socket) return false;
    socket.emit("sfu:kick-peer", { userId });
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
    return this.produceWithSource(track, track.kind === "video" ? "camera" : undefined);
  }

  async produceScreen(track: MediaStreamTrack): Promise<Producer | null> {
    return this.produceWithSource(track, "screen");
  }

  private async produceWithSource(
    track: MediaStreamTrack,
    source?: SfuMediaSource,
  ): Promise<Producer | null> {
    if (!this.sendTransport) {
      console.error("[SFU] Send transport not ready");
      return null;
    }

    const kind = track.kind as "audio" | "video";
    const dedupeKey = source === "screen" ? "screen" : kind;

    if (source !== "screen") {
      const existing = this.getProducerByKind(kind);
      if (existing) {
        console.warn("[SFU] Producer already exists for kind:", kind);
        return existing;
      }
    } else {
      const existing = this.getScreenProducer();
      if (existing) {
        console.warn("[SFU] Screen producer already exists");
        return existing;
      }
    }

    const pending = this.producingInProgress.get(dedupeKey);
    if (pending) {
      console.warn("[SFU] Produce already in-flight for:", dedupeKey);
      return pending;
    }

    const producePromise = this.doProduceTrack(track, source);
    this.producingInProgress.set(dedupeKey, producePromise);

    try {
      return await producePromise;
    } finally {
      this.producingInProgress.delete(dedupeKey);
    }
  }

  private async doProduceTrack(
    track: MediaStreamTrack,
    source?: SfuMediaSource,
  ): Promise<Producer | null> {
    if (!this.sendTransport) return null;

    try {
      const isVideo = track.kind === "video";
      const isScreen = source === "screen";
      const producer = await this.sendTransport.produce({
        track,
        encodings: isVideo && !isScreen ? SIMULCAST_ENCODINGS : undefined,
        codecOptions: isVideo
          ? { videoGoogleStartBitrate: 1000 }
          : { opusStereo: true, opusFec: true },
        appData: { source: source ?? (isVideo ? "camera" : undefined) },
      });

      this.producers.set(producer.id, producer);
      console.log("[SFU] Produced track:", track.kind, producer.id, source ?? "");

      producer.on("transportclose", () => {
        this.producers.delete(producer.id);
      });

      return producer;
    } catch (error) {
      console.error("[SFU] Failed to produce track:", error);
      // Re-throw structured produce errors so callers can inspect the code.
      // For all other errors, return null to preserve existing behaviour.
      if (error instanceof SfuProduceError) {
        throw error;
      }
      return null;
    }
  }

  closeScreenProducer(): void {
    const producer = this.getScreenProducer();
    if (!producer) return;

    producer.close();
    this.producers.delete(producer.id);
    this.connection.getSocket()?.emit("sfu:close-producer", { producerId: producer.id });
    this.updateState({ screenProducerId: null });
  }

  isScreenShareBlocked(): boolean {
    return this.state.isScreenShareBlocked;
  }

  onProduceError(callback: (code: SfuProduceErrorCode) => void): () => void {
    this.produceErrorCallbacks.add(callback);
    return () => this.produceErrorCallbacks.delete(callback);
  }

  private getScreenProducer(): Producer | undefined {
    for (const producer of this.producers.values()) {
      if (
        producer.kind === "video" &&
        (producer.appData as Record<string, unknown> | undefined)?.source === "screen"
      ) {
        return producer;
      }
    }
    return undefined;
  }

  pauseProducer(producerId: string): void {
    const producer = this.producers.get(producerId);
    if (producer) {
      producer.pause();
      this.connection.getSocket()?.emit("sfu:pause-producer", { producerId });
    }
  }

  resumeProducer(producerId: string): void {
    const producer = this.producers.get(producerId);
    if (producer) {
      producer.resume();
      this.connection.getSocket()?.emit("sfu:resume-producer", { producerId });
    }
  }

  closeProducer(kind: "audio" | "video"): void {
    const producer = this.getProducerByKind(kind);
    if (!producer) return;

    producer.close();
    this.producers.delete(producer.id);
    this.connection.getSocket()?.emit("sfu:close-producer", { producerId: producer.id });

    if (kind === "audio") {
      this.updateState({ audioProducerId: null });
    } else {
      this.updateState({ videoProducerId: null });
    }
  }

  async replaceTrack(kind: "audio" | "video", newTrack: MediaStreamTrack | null): Promise<boolean> {
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

  getProducerByKind(kind: "audio" | "video"): Producer | undefined {
    for (const producer of this.producers.values()) {
      if (producer.kind !== kind) continue;
      if (
        kind === "video" &&
        (producer.appData as Record<string, unknown> | undefined)?.source === "screen"
      ) {
        continue;
      }
      return producer;
    }
    return undefined;
  }

  /**
   * Emit sfu:set-preferred-layers to the server to request a simulcast layer switch.
   * Should only be called for video consumers.
   */
  setPreferredLayers(consumerId: string, spatialLayer: SimulcastSpatialLayer): void {
    this.connection.getSocket()?.emit("sfu:set-preferred-layers", { consumerId, spatialLayer });
  }

  /**
   * Look up the consumer ID for the camera video stream of a given remote peer.
   * Returns undefined if no camera video consumer exists for that peer.
   * Skips screen-share consumers even if they are video kind.
   */
  getVideoConsumerIdForUserId(userId: string): string | undefined {
    const peer = this.peers.get(userId);
    if (!peer) return undefined;

    for (const [consumerId, consumer] of this.consumers) {
      if (consumer.kind !== "video") continue;
      const producerInfo = peer.producers.get(consumer.producerId);
      if (!producerInfo) continue;
      // Only return camera consumers, not screen-share consumers.
      if (producerInfo.source === "screen") continue;
      return consumerId;
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

  onScreenShareStopped(callback: SfuScreenShareStoppedCallback): () => void {
    this.screenShareStoppedCallbacks.add(callback);
    return () => this.screenShareStoppedCallbacks.delete(callback);
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
    console.log("[SFU] Connected");
    this.updateState({ connectionState: "connected" });
  }

  private handleDisconnected(): void {
    console.log("[SFU] Disconnected");
    // Reset device-level flags before closeAll() so the intermediate state
    // notification from closeAll() never has isSendTransportCreated=true while
    // the send transport is already null (which would trigger spurious produce
    // attempts in consumers of onStateChange).
    this.updateState({
      connectionState: "connecting",
      isDeviceLoaded: false,
      isSendTransportCreated: false,
    });
    this.closeAll();
    this.device = null;
    this.pendingNewProducers = [];
  }

  private handleReconnectFailed(): void {
    console.log("[SFU] Reconnect failed");
    this.updateState({ connectionState: "failed" });
  }

  private async handleJoined(payload: SfuJoinedPayload): Promise<void> {
    console.log("[SFU] Joined room, loading device...");
    await this.loadDevice(payload.routerRtpCapabilities);
  }

  private async handleTransportCreated(payload: SfuTransportCreatedPayload): Promise<void> {
    if (!this.device) return;

    const transportOptions = {
      id: payload.transportId,
      iceParameters: payload.iceParameters,
      iceCandidates: payload.iceCandidates,
      dtlsParameters: payload.dtlsParameters,
      iceServers: payload.iceServers,
    };

    // TODO(TASK-072): remove debug log after verifying ICE servers flow
    console.log("[SFU] Transport created:", payload.direction, {
      iceServers: payload.iceServers,
      transportId: payload.transportId,
    });

    if (payload.direction === "send") {
      this.sendTransport = this.device.createSendTransport(transportOptions);
      this.updateState({ isSendTransportCreated: true });

      this.sendTransport.on(
        "connect",
        async (
          { dtlsParameters }: { dtlsParameters: DtlsParameters },
          callback: () => void,
          errback: (error: Error) => void,
        ) => {
          try {
            const sendTransport = this.sendTransport;
            if (!sendTransport) {
              throw new Error("Send transport not ready");
            }

            this.connection.getSocket()?.emit("sfu:connect-transport", {
              transportId: sendTransport.id,
              dtlsParameters,
            });
            callback();
          } catch (error) {
            errback(error as Error);
          }
        },
      );

      this.sendTransport.on(
        "produce",
        async (
          {
            kind,
            rtpParameters,
            appData,
          }: { kind: MediaKind; rtpParameters: RtpParameters; appData?: Record<string, unknown> },
          callback: ({ id }: { id: string }) => void,
          errback: (error: Error) => void,
        ) => {
          try {
            const sendTransport = this.sendTransport;
            if (!sendTransport) {
              throw new Error("Send transport not ready");
            }

            const requestId = crypto.randomUUID();
            const source = appData?.source as SfuMediaSource | undefined;

            const promise = new Promise<string>((resolve, reject) => {
              this.pendingProduceRequests.set(requestId, {
                resolve,
                reject,
                source: source ?? "camera",
              });
            });

            this.connection.getSocket()?.emit("sfu:produce", {
              requestId,
              transportId: sendTransport.id,
              kind,
              rtpParameters,
              appData: appData
                ? { source: appData.source as SfuMediaSource | undefined }
                : undefined,
            });

            const producerId = await promise;
            callback({ id: producerId });
          } catch (error) {
            errback(error as Error);
          }
        },
      );
    } else {
      this.recvTransport = this.device.createRecvTransport(transportOptions);

      // Replay any producers that arrived before the recv transport was ready
      if (this.pendingNewProducers.length > 0) {
        const pending = this.pendingNewProducers.splice(0);
        console.log("[SFU] Processing", pending.length, "buffered new-producer(s)");
        for (const pendingPayload of pending) {
          void this.consumeProducer(pendingPayload);
        }
      }

      this.recvTransport.on(
        "connect",
        async (
          { dtlsParameters }: { dtlsParameters: DtlsParameters },
          callback: () => void,
          errback: (error: Error) => void,
        ) => {
          try {
            const recvTransport = this.recvTransport;
            if (!recvTransport) {
              throw new Error("Receive transport not ready");
            }

            this.connection.getSocket()?.emit("sfu:connect-transport", {
              transportId: recvTransport.id,
              dtlsParameters,
            });
            callback();
          } catch (error) {
            errback(error as Error);
          }
        },
      );
    }
  }

  private handleTransportConnected(payload: { transportId: string }): void {
    console.log("[SFU] Transport connected:", payload.transportId);
    if (this.sendTransport?.id === payload.transportId) {
      this.updateState({ sendTransportConnected: true });
    } else if (this.recvTransport?.id === payload.transportId) {
      this.updateState({ recvTransportConnected: true });
    }
  }

  private handleProducerCreated(payload: SfuProducerCreatedPayload): void {
    const { requestId, producerId, kind, appData } = payload;
    const source = appData?.source;

    console.log("[SFU] Producer created:", kind, producerId, source ?? "");

    const pending = this.pendingProduceRequests.get(requestId);
    if (pending) {
      pending.resolve(producerId);
      this.pendingProduceRequests.delete(requestId);
    }

    if (kind === "audio") {
      this.updateState({ audioProducerId: producerId });
    } else if (source === "screen") {
      this.updateState({ screenProducerId: producerId });
    } else {
      this.updateState({ videoProducerId: producerId });
    }
  }

  private handleProduceError(payload: {
    requestId: string;
    code: SfuProduceErrorCode;
    message: string;
  }): void {
    console.error("[SFU] Produce error:", payload.code, payload.message);

    const pending = this.pendingProduceRequests.get(payload.requestId);
    if (pending) {
      this.pendingProduceRequests.delete(payload.requestId);
      pending.reject(new SfuProduceError(payload.code, payload.message));
    }

    for (const cb of this.produceErrorCallbacks) {
      cb(payload.code);
    }
  }

  private handlePeerJoined(payload: SfuPeerJoinedPayload): void {
    console.log("[SFU] Peer joined:", payload.userId, payload.username);
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
    this.peerJoinedCallbacks.forEach((callback) => {
      callback(peer!);
    });
  }

  private handleExistingPeers(peers: SfuExistingPeersPayload[]): void {
    console.log("[SFU] Existing peers:", peers.length);
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
      this.peerJoinedCallbacks.forEach((callback) => {
        callback(peer!);
      });
    }
  }

  private handleNewProducer(payload: SfuNewProducerPayload): void {
    console.log("[SFU] New producer:", payload.userId, payload.kind);
    // A screen-share producer from another peer means the room is blocked for us.
    if (payload.appData?.source === "screen" && payload.userId !== this.localUserId) {
      this.updateState({ isScreenShareBlocked: true });
    }
    void this.consumeProducer(payload);
  }

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
      console.log("[SFU] Consumer ready:", payload.kind, consumer.id);

      // Resume the consumer — delay for audio to let jitter buffer initialise
      if (payload.kind === "audio") {
        setTimeout(() => {
          this.connection.getSocket()?.emit("sfu:resume-consumer", { consumerId: consumer.id });
        }, 150);
      } else {
        this.connection.getSocket()?.emit("sfu:resume-consumer", { consumerId: consumer.id });
      }

      // Find the peer userId for this consumer
      let userId = "";
      let source: SfuMediaSource | undefined;
      for (const [uid, peer] of this.peers) {
        const producerInfo = peer.producers.get(payload.producerId);
        if (producerInfo) {
          userId = uid;
          source = producerInfo.source;
          break;
        }
      }

      // Notify track callback
      for (const callback of this.trackCallbacks) {
        callback(consumer.track, payload.kind, userId, source);
      }

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

      consumer.on("transportclose", () => {
        this.consumers.delete(consumer.id);
      });

      consumer.on("trackended", () => {
        consumer.close();
        this.consumers.delete(consumer.id);
      });
    } catch (error) {
      console.error("[SFU] Failed to create consumer:", error);
    }
  }

  private handleProducerStateChanged(payload: SfuProducerStateChangedPayload): void {
    console.log(
      "[SFU] Producer state changed:",
      payload.userId,
      payload.kind,
      payload.paused ? "paused" : "resumed",
    );
    this.producerStateCallbacks.forEach((callback) => {
      callback(payload);
    });
  }

  private handlePeerLeft(payload: { userId: string }): void {
    console.log("[SFU] Peer left:", payload.userId);
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
    this.peerLeftCallbacks.forEach((callback) => {
      callback(payload.userId);
    });
  }

  private handleKicked(payload: SfuKickedPayload): void {
    console.log("[SFU] Kicked from room:", payload.roomId);
    this.kickedCallbacks.forEach((callback) => {
      callback(payload);
    });
    this.closeAll();
    this.updateState({ connectionState: "disconnected" });
  }

  private handleRoomEnded(payload: SfuRoomEndedPayload): void {
    console.log("[SFU] Room ended:", payload.roomId);
    for (const callback of this.roomEndedCallbacks) {
      callback(payload);
    }
    this.closeAll();
    this.updateState({ connectionState: "disconnected" });
  }

  private handleScreenShareStarted(payload: { userId: string }): void {
    console.log("[SFU] Screen share started:", payload.userId);
    if (payload.userId !== this.localUserId) {
      this.updateState({ isScreenShareBlocked: true });
    }
  }

  private handleScreenShareStopped(payload: SfuScreenShareStoppedPayload): void {
    console.log("[SFU] Screen share stopped:", payload.userId);
    if (payload.userId !== this.localUserId) {
      this.updateState({ isScreenShareBlocked: false });
      // Notify subscribers so they can clear the remote peer's screen state
      // immediately, without waiting for track.onended.
      for (const cb of this.screenShareStoppedCallbacks) {
        cb(payload);
      }
    }
  }

  private handleConsumerClosed(payload: SfuConsumerClosedPayload): void {
    console.log("[SFU] Consumer closed by server:", payload.consumerId);
    const consumer = this.consumers.get(payload.consumerId);
    if (!consumer) return;
    consumer.close();
    this.consumers.delete(payload.consumerId);
  }

  // Private helpers
  private async loadDevice(routerRtpCapabilities: RtpCapabilities): Promise<void> {
    try {
      this.device = new Device();
      await this.device.load({ routerRtpCapabilities });
      this.updateState({ isDeviceLoaded: true });
      console.log("[SFU] Device loaded");

      // Create transports after device is loaded
      await this.createTransports();
    } catch (error) {
      console.error("[SFU] Failed to load device:", error);
      this.updateState({ connectionState: "failed" });
    }
  }

  private async createTransports(): Promise<void> {
    const socket = this.connection.getSocket();
    if (!socket) return;

    socket.emit("sfu:create-send-transport");
    socket.emit("sfu:create-recv-transport");
  }

  private async consumeProducer(payload: SfuNewProducerPayload): Promise<void> {
    if (!this.connection.getSocket() || !this.device || !this.recvTransport) {
      console.warn("[SFU] Recv transport not ready, buffering new-producer:", payload.producerId);
      this.pendingNewProducers.push(payload);
      return;
    }

    // Track peer info
    let peer = this.peers.get(payload.userId);
    if (!peer) {
      peer = {
        userId: payload.userId,
        username: payload.username || "",
        producers: new Map(),
      };
      this.peers.set(payload.userId, peer);
      this.peerJoinedCallbacks.forEach((callback) => {
        callback(peer!);
      });
    }
    peer.producers.set(payload.producerId, {
      kind: payload.kind,
      paused: payload.paused,
      source: payload.appData?.source,
    });

    // Request to consume
    this.connection.getSocket()!.emit("sfu:consume", {
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
    this.producers.forEach((producer) => {
      producer.close();
    });
    this.consumers.forEach((consumer) => {
      consumer.close();
    });
    this.producers.clear();
    this.consumers.clear();
    this.producingInProgress.clear();
    for (const pending of this.pendingProduceRequests.values()) {
      pending.reject(new Error("Transport closed"));
    }
    this.pendingProduceRequests.clear();
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
      screenProducerId: null,
      isScreenShareBlocked: false,
    });
  }

  private resetState(): void {
    this.device = null;
    this.sendTransport = null;
    this.recvTransport = null;
    this.producers.clear();
    this.consumers.clear();
    this.producingInProgress.clear();
    for (const pending of this.pendingProduceRequests.values()) {
      pending.reject(new Error("Disconnected"));
    }
    this.pendingProduceRequests.clear();
    this.peers.clear();
    this.pendingNewProducers = [];
    this.localUserId = null;
    this.state = {
      connectionState: "disconnected",
      isDeviceLoaded: false,
      isSendTransportCreated: false,
      sendTransportConnected: false,
      recvTransportConnected: false,
      audioProducerId: null,
      videoProducerId: null,
      screenProducerId: null,
      isScreenShareBlocked: false,
    };
    this.notifyStateChange();
  }

  private updateState(partial: Partial<SfuState>): void {
    this.state = { ...this.state, ...partial };
    this.notifyStateChange();
  }

  private notifyStateChange(): void {
    this.stateCallbacks.forEach((callback) => {
      callback(this.getState());
    });
  }
}

/** Singleton instance for backward compatibility */
export const sfuManager = new SfuManager();
