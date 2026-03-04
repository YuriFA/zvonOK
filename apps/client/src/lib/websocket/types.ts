import type { Socket } from 'socket.io-client';

// Connection state
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

// Server -> Client events
export interface ServerToClientEvents {
  'room:joined': (data: RoomJoinedPayload) => void;
  'peer:joined': (data: PeerJoinedPayload) => void;
  'peer:left': (data: PeerLeftPayload) => void;
  'webrtc:offer': (data: WebRTCOfferEvent) => void;
  'webrtc:answer': (data: WebRTCAnswerEvent) => void;
  'webrtc:ice': (data: WebRTCIceEvent) => void;
  'media:state_changed': (data: MediaStateChangedPayload) => void;
  'error': (data: ErrorPayload) => void;
}

// Client -> Server events
export interface ClientToServerEvents {
  'join:room': (data: JoinRoomPayload) => void;
  'leave:room': () => void;
  'webrtc:offer': (data: WebRTCOfferPayload) => void;
  'webrtc:answer': (data: WebRTCAnswerPayload) => void;
  'webrtc:ice': (data: WebRTCIcePayload) => void;
  'media:state': (data: MediaStatePayload) => void;
}

// Payload types
export interface JoinRoomPayload {
  roomCode: string;
}

export interface RoomJoinedPayload {
  roomId: string;
  peerId: string;
  peers: PeerInfo[];
}

export interface PeerInfo {
  id: string;
  userInfo: {
    username: string;
  };
}

export interface PeerJoinedPayload {
  peerId: string;
  userInfo: {
    username: string;
  };
}

export interface PeerLeftPayload {
  peerId: string;
}

// Client -> Server: WebRTC signalling (uses targetPeerId)
export interface WebRTCOfferPayload {
  targetPeerId: string;
  offer: RTCSessionDescriptionInit;
}

export interface WebRTCAnswerPayload {
  targetPeerId: string;
  answer: RTCSessionDescriptionInit;
}

export interface WebRTCIcePayload {
  targetPeerId: string;
  candidate: RTCIceCandidateInit;
}

// Server -> Client: WebRTC signalling (uses fromPeerId)
export interface WebRTCOfferEvent {
  fromPeerId: string;
  offer: RTCSessionDescriptionInit;
}

export interface WebRTCAnswerEvent {
  fromPeerId: string;
  answer: RTCSessionDescriptionInit;
}

export interface WebRTCIceEvent {
  fromPeerId: string;
  candidate: RTCIceCandidateInit;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

// Media state sync
export interface MediaStatePayload {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

export interface MediaStateChangedPayload {
  peerId: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

// Connection state change callback
export type ConnectionStatusCallback = (status: ConnectionStatus) => void;

// Event handler types
export type EventHandler<E> = E extends (...args: infer A) => void
  ? (...args: A) => void
  : never;

// Socket type with our event definitions
export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
