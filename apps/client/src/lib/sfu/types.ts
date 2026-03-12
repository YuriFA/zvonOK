import type {
  RtpCapabilities,
  RtpParameters,
  DtlsParameters,
  IceParameters,
  IceCandidate,
} from 'mediasoup-client/types';

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
export type SfuTransportDirection = 'send' | 'recv';

// Transport created response from server
export interface SfuTransportCreatedPayload {
  direction: SfuTransportDirection;
  transportId: string;
  iceParameters: IceParameters;
  iceCandidates: IceCandidate[];
  dtlsParameters: DtlsParameters;
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

// Produce payload sent to server
export interface SfuProducePayload {
  transportId: string;
  kind: 'audio' | 'video';
  rtpParameters: RtpParameters;
}

// Producer created response from server
export interface SfuProducerCreatedPayload {
  producerId: string;
  userId: string;
  kind: 'audio' | 'video';
}

// New producer notification from server
export interface SfuNewProducerPayload {
  producerId: string;
  userId: string;
  username: string;
  kind: 'audio' | 'video';
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
  kind: 'audio' | 'video';
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

export interface SfuKickPeerPayload {
  userId: string;
}

export interface SfuKickedPayload {
  roomId: string;
}

// Peer info for tracking remote producers
export interface SfuPeerInfo {
  userId: string;
  username: string;
  producers: Map<string, { kind: 'audio' | 'video' }>;
}

// SFU connection state
export type SfuConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'failed';

// SFU manager state
export interface SfuState {
  connectionState: SfuConnectionState;
  isDeviceLoaded: boolean;
  isSendTransportCreated: boolean;
  sendTransportConnected: boolean;
  recvTransportConnected: boolean;
  audioProducerId: string | null;
  videoProducerId: string | null;
}

// Callback types
export type SfuTrackCallback = (track: MediaStreamTrack, kind: 'audio' | 'video', userId: string) => void;
export type SfuPeerCallback = (peer: SfuPeerInfo) => void;
export type SfuStateCallback = (state: SfuState) => void;

// Quality stats types
export interface QualityStats {
  bitrate: number;        // kbps
  packetLoss: number;     // percentage
  rtt: number;            // ms
  width: number;
  height: number;
  fps: number;
}

export type QualityLevel = 'excellent' | 'good' | 'fair' | 'poor';

export interface QualityScore {
  level: QualityLevel;
  score: number;          // 0-100
}

export interface PeerQualityStats {
  userId: string;
  stats: QualityStats;
  score: QualityScore;
}

export type QualityStatsCallback = (stats: Map<string, PeerQualityStats>) => void;
