import type {
  RtpCapabilities,
  RtpParameters,
  DtlsParameters,
  IceParameters,
  IceCandidate,
} from "mediasoup-client/types";

export type SfuMediaSource = "camera" | "screen";

export type SfuProduceErrorCode =
  | "SCREEN_SHARE_ALREADY_ACTIVE"
  | "SEND_TRANSPORT_NOT_READY"
  | "TRANSPORT_NOT_FOUND"
  | "PRODUCE_FAILED";

export class SfuProduceError extends Error {
  readonly code: SfuProduceErrorCode;
  constructor(code: SfuProduceErrorCode, message: string) {
    super(message);
    this.name = "SfuProduceError";
    this.code = code;
  }
}

// Join payload sent to server
export interface SfuJoinPayload {
  roomId: string;
  userId: string;
  username: string;
  roomOwnerId?: string;
}

// Joined response from server
export interface SfuJoinedPayload {
  routerRtpCapabilities: RtpCapabilities;
}

// Transport direction
export type SfuTransportDirection = "send" | "recv";

// Transport created response from server
export interface SfuTransportCreatedPayload {
  direction: SfuTransportDirection;
  transportId: string;
  iceParameters: IceParameters;
  iceCandidates: IceCandidate[];
  dtlsParameters: DtlsParameters;
  iceServers?: RTCIceServer[];
}

// Transport connect payload sent to server
export interface SfuTransportConnectPayload {
  transportId: string;
  dtlsParameters: DtlsParameters;
}

// Transport connected response from server
export interface SfuTransportConnectedPayload {
  transportId: string;
}

export interface SfuProduceAppData {
  source?: SfuMediaSource;
}

// Produce payload sent to server
export interface SfuProducePayload {
  requestId: string;
  transportId: string;
  kind: "audio" | "video";
  rtpParameters: RtpParameters;
  appData?: SfuProduceAppData;
}

// Producer created response from server
export interface SfuProducerCreatedPayload {
  requestId: string;
  producerId: string;
  userId: string;
  kind: "audio" | "video";
  appData?: SfuProduceAppData;
}

// Produce error response from server
export interface SfuProduceErrorPayload {
  requestId: string;
  code: SfuProduceErrorCode;
  message: string;
}

// New producer notification from server
export interface SfuNewProducerPayload {
  producerId: string;
  userId: string;
  username: string;
  kind: "audio" | "video";
  paused: boolean;
  appData?: SfuProduceAppData;
}

// Screen share started notification from server
export interface SfuScreenShareStartedPayload {
  userId: string;
}

// Screen share stopped notification from server
export interface SfuScreenShareStoppedPayload {
  userId: string;
}

// Consumer closed notification from server
export interface SfuConsumerClosedPayload {
  consumerId: string;
}

// Consume payload sent to server
export interface SfuConsumePayload {
  producerId: string;
  rtpCapabilities: RtpCapabilities;
}

// Consumer created response from server
export interface SfuConsumerCreatedPayload {
  consumerId: string;
  producerId: string;
  kind: "audio" | "video";
  rtpParameters: RtpParameters;
}

// Resume consumer payload sent to server
export interface SfuResumeConsumerPayload {
  consumerId: string;
}

// Pause/Resume producer payloads
export interface SfuPauseProducerPayload {
  producerId: string;
}

export interface SfuResumeProducerPayload {
  producerId: string;
}

// Producer state changed notification from server (broadcast to other peers)
export interface SfuProducerStateChangedPayload {
  producerId: string;
  kind: "audio" | "video";
  userId: string;
  paused: boolean;
  source?: SfuMediaSource;
}

export interface SfuKickPeerPayload {
  userId: string;
}

export interface SfuKickedPayload {
  roomId: string;
}

export interface SfuRoomEndedPayload {
  roomId: string;
}

// Peer info for tracking remote producers
export interface SfuPeerInfo {
  userId: string;
  username: string;
  producers: Map<string, { kind: "audio" | "video"; paused?: boolean; source?: SfuMediaSource }>;
}

// Payload for sfu:peer-joined event (peer joins after you)
export interface SfuPeerJoinedPayload {
  userId: string;
  username: string;
}

// Payload for sfu:existing-peers event (peers already in room when you join)
export interface SfuExistingPeersPayload {
  userId: string;
  username: string;
}

// SFU connection state
export type SfuConnectionState = "disconnected" | "connecting" | "connected" | "failed";

// SFU manager state
export interface SfuState {
  connectionState: SfuConnectionState;
  isDeviceLoaded: boolean;
  isSendTransportCreated: boolean;
  sendTransportConnected: boolean;
  recvTransportConnected: boolean;
  audioProducerId: string | null;
  videoProducerId: string | null;
  screenProducerId: string | null;
  isScreenShareBlocked: boolean;
}

// Callback types
export type SfuTrackCallback = (
  track: MediaStreamTrack,
  kind: "audio" | "video",
  userId: string,
  source?: SfuMediaSource,
) => void;
export type SfuPeerCallback = (peer: SfuPeerInfo) => void;
export type SfuStateCallback = (state: SfuState) => void;
export type SfuProducerStateCallback = (payload: SfuProducerStateChangedPayload) => void;
export type SfuScreenShareStoppedCallback = (payload: SfuScreenShareStoppedPayload) => void;

// Quality stats types
export interface QualityStats {
  bitrate: number; // kbps
  packetLoss: number; // percentage
  rtt: number; // ms
  jitter: number; // ms
  width: number;
  height: number;
  fps: number;
}

export type QualityLevel = "excellent" | "good" | "fair" | "poor";

export interface QualityScore {
  level: QualityLevel;
  score: number; // 0-100
}

export interface PeerQualityStats {
  userId: string;
  stats: QualityStats;
  score: QualityScore;
}

export type QualityStatsCallback = (stats: Map<string, PeerQualityStats>) => void;

// Simulcast spatial layer (0 = low, 1 = mid, 2 = high)
export type SimulcastSpatialLayer = 0 | 1 | 2;

// Payload sent to server to request a simulcast layer switch
export interface SfuSetPreferredLayersPayload {
  consumerId: string;
  spatialLayer: SimulcastSpatialLayer;
}
