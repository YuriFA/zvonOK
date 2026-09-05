import type { Socket } from 'socket.io';
import type {
  Router,
  WebRtcTransport,
  Producer,
  Consumer,
  RtpCapabilities,
  RtpParameters,
  DtlsParameters,
  IceParameters,
  IceCandidate,
} from 'mediasoup/types';
import type { IceServerConfig } from '../config/mediasoup.config';

export interface PeerPermissions {
  publish: boolean;
  admin: boolean;
}

export interface Peer {
  id: string;
  userId: string;
  username: string;
  socket: Socket;
  sendTransport?: WebRtcTransport;
  recvTransport?: WebRtcTransport;
  producers: Map<string, Producer>;
  consumers: Map<string, Consumer>;
  permissions?: PeerPermissions;
}

export interface Room {
  id: string;
  router: Router;
  peers: Map<string, Peer>;
}

export interface SfuJoinPayload {
  roomId: string;
  userId: string;
  username: string;
  roomOwnerId?: string;
  roomSlug?: string;
  token?: string;
}

export type SfuJoinErrorCode =
  | 'ROOM_TOKEN_INVALID'
  | 'ROOM_TOKEN_EXPIRED'
  | 'ROOM_TOKEN_ROOM_MISMATCH'
  | 'ROOM_LOCKED';

export interface SfuJoinErrorPayload {
  code: SfuJoinErrorCode;
  message: string;
}

export interface SfuJoinedPayload {
  routerRtpCapabilities: RtpCapabilities;
}

export type SfuTransportDirection = 'send' | 'recv';

export interface SfuTransportCreatedPayload {
  direction: SfuTransportDirection;
  transportId: string;
  iceParameters: IceParameters;
  iceCandidates: IceCandidate[];
  dtlsParameters: DtlsParameters;
  iceServers?: IceServerConfig[];
}

export interface SfuTransportConnectPayload {
  transportId: string;
  dtlsParameters: DtlsParameters;
}

export interface SfuTransportConnectedPayload {
  transportId: string;
}

export type SfuMediaSource = 'camera' | 'screen';

export interface SfuProduceAppData {
  source?: SfuMediaSource;
}

export type SfuProduceErrorCode =
  | 'SCREEN_SHARE_ALREADY_ACTIVE'
  | 'SEND_TRANSPORT_NOT_READY'
  | 'TRANSPORT_NOT_FOUND'
  | 'PUBLISH_NOT_ALLOWED'
  | 'PRODUCE_FAILED';

export interface SfuProducePayload {
  requestId: string;
  transportId: string;
  kind: 'audio' | 'video';
  rtpParameters: RtpParameters;
  appData?: SfuProduceAppData;
}

export interface SfuProducerCreatedPayload {
  requestId: string;
  producerId: string;
  userId: string;
  kind: 'audio' | 'video';
  appData?: SfuProduceAppData;
}

export interface SfuProduceErrorPayload {
  requestId: string;
  code: SfuProduceErrorCode;
  message: string;
}

export interface SfuCloseProducerPayload {
  producerId: string;
}

export interface SfuScreenShareStartedPayload {
  userId: string;
}

export interface SfuScreenShareStoppedPayload {
  userId: string;
}

export interface SfuConsumePayload {
  producerId: string;
  rtpCapabilities: RtpCapabilities;
}

export interface SfuConsumerCreatedPayload {
  consumerId: string;
  producerId: string;
  kind: 'audio' | 'video';
  rtpParameters: RtpParameters;
}

export interface SfuResumeConsumerPayload {
  consumerId: string;
}

export interface SfuPauseProducerPayload {
  producerId: string;
}

export interface SfuResumeProducerPayload {
  producerId: string;
}

export interface SfuKickPeerPayload {
  userId: string;
}

export interface SfuMutePeerPayload {
  userId: string;
}

export interface SfuLockRoomPayload {
  locked: boolean;
}

export interface SfuPeerMutedPayload {
  userId: string;
}

export interface SfuRoomLockedPayload {
  locked: boolean;
}

// Coded denial for host-control actions (sfu:mute-peer, sfu:mute-all,
// sfu:lock-room), emitted on the requesting socket only.
export type SfuHostErrorCode = 'NOT_ROOM_HOST';

export interface SfuHostErrorPayload {
  code: SfuHostErrorCode;
  message: string;
}

// Peer joined payload - sent when a peer joins the room (independent of media)
export interface SfuPeerJoinedPayload {
  userId: string;
  username: string;
}

// Existing peer info - sent to new peer about existing room members
export interface SfuExistingPeerPayload {
  userId: string;
  username: string;
}

// Payload for sfu:set-preferred-layers (client → server)
export interface SfuSetPreferredLayersPayload {
  consumerId: string;
  spatialLayer: number;
}
