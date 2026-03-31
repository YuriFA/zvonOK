/**
 * SFU module interfaces.
 * These interfaces define the contracts for SFU management components,
 * following SOLID principles with single-responsibility interfaces.
 */

import type { Producer } from "mediasoup-client/types";
import type { Socket } from "socket.io-client";

import type {
  SfuState,
  SfuStateCallback,
  SfuTrackCallback,
  SfuPeerCallback,
  SfuPeerInfo,
  SfuKickedPayload,
  SfuRoomEndedPayload,
  SfuJoinPayload,
  QualityStatsCallback,
  PeerQualityStats,
  SfuProducerStateCallback,
} from "./types";

/**
 * Responsible for socket connection lifecycle.
 * Single responsibility: connect/disconnect/reconnect.
 */
interface ISfuConnection {
  /** Connect to SFU server */
  connect(): void;
  /** Disconnect from SFU server */
  disconnect(): void;
  /** Check if connected */
  isConnected(): boolean;
  /** Get the underlying socket */
  getSocket(): Socket | null;
}

/**
 * Responsible for room join/leave operations.
 * Single responsibility: room membership signaling.
 */
interface ISfuRoomMembership {
  /** Join a room */
  joinRoom(payload: SfuJoinPayload): Promise<void>;
  /** Leave the current room */
  leaveRoom(): void;
  /** Kick a peer from the room */
  kickPeer(userId: string): boolean;
  /** Subscribe to kicked events */
  onKicked(callback: (payload: SfuKickedPayload) => void): () => void;
  /** Subscribe to room-ended events */
  onRoomEnded(callback: (payload: SfuRoomEndedPayload) => void): () => void;
}

/**
 * Responsible for producing local tracks.
 * Single responsibility: producer lifecycle.
 */
interface ISfuProducerManager {
  /** Produce a local track */
  produce(track: MediaStreamTrack): Promise<Producer | null>;
  /** Pause a producer */
  pauseProducer(producerId: string): void;
  /** Resume a producer */
  resumeProducer(producerId: string): void;
  /** Close a producer by kind */
  closeProducer(kind: "audio" | "video"): void;
  /** Replace track in a producer */
  replaceTrack(kind: "audio" | "video", track: MediaStreamTrack | null): Promise<boolean>;
  /** Get producer by kind */
  getProducerByKind(kind: "audio" | "video"): Producer | undefined;
}

/**
 * Responsible for peer tracking.
 * Single responsibility: peer registry.
 */
interface ISfuPeerRegistry {
  /** Get all peers */
  getPeers(): Map<string, SfuPeerInfo>;
  /** Get a specific peer */
  getPeer(userId: string): SfuPeerInfo | undefined;
  /** Subscribe to peer joined events */
  onPeerJoined(callback: SfuPeerCallback): () => void;
  /** Subscribe to peer left events */
  onPeerLeft(callback: (userId: string) => void): () => void;
  /** Subscribe to remote producer state change events */
  onProducerStateChange(callback: SfuProducerStateCallback): () => void;
}

/**
 * Responsible for quality statistics.
 * Single responsibility: stats collection and scoring.
 */
interface ISfuStatsCollector {
  /** Start collecting stats */
  startStatsCollection(intervalMs?: number): void;
  /** Stop collecting stats */
  stopStatsCollection(): void;
  /** Subscribe to quality stats */
  onQualityStats(callback: QualityStatsCallback): () => void;
  /** Get current stats */
  getStats(): Map<string, PeerQualityStats>;
}

/**
 * Responsible for SFU state broadcasting.
 * Single responsibility: state events.
 */
interface ISfuStateNotifier {
  /** Get current state */
  getState(): SfuState;
  /** Subscribe to state changes */
  onStateChange(callback: SfuStateCallback): () => void;
  /** Subscribe to remote track events */
  onTrack(callback: SfuTrackCallback): () => void;
}

/**
 * Facade combining all SFU concerns.
 * Note: Transport management (device, send/recv transports) is an internal
 * implementation detail and not exposed on the public interface.
 */
export interface ISfuManager
  extends
    ISfuConnection,
    ISfuRoomMembership,
    ISfuProducerManager,
    ISfuPeerRegistry,
    ISfuStatsCollector,
    ISfuStateNotifier {}
