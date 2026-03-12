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

export interface Peer {
  id: string;
  userId: string;
  username: string;
  socket: Socket;
  sendTransport?: WebRtcTransport;
  recvTransport?: WebRtcTransport;
  producers: Map<string, Producer>;
  consumers: Map<string, Consumer>;
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
}

export interface SfuTransportConnectPayload {
  transportId: string;
  dtlsParameters: DtlsParameters;
}

export interface SfuTransportConnectedPayload {
  transportId: string;
}

export interface SfuProducePayload {
  transportId: string;
  kind: 'audio' | 'video';
  rtpParameters: RtpParameters;
}

export interface SfuProducerCreatedPayload {
  producerId: string;
  userId: string;
  kind: 'audio' | 'video';
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
