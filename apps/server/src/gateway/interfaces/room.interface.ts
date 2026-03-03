export interface PeerInfo {
  id: string;
  userId?: string;
  username?: string;
}

export interface RoomJoinedPayload {
  roomId: string;
  peerId: string;
  peers: PeerInfo[];
}

export interface PeerJoinedPayload {
  peerId: string;
  userInfo: { username?: string };
}

export interface PeerLeftPayload {
  peerId: string;
}

export interface JoinRoomPayload {
  roomCode: string;
}

// WebRTC Signalling Types
export interface OfferPayload {
  targetPeerId: string;
  offer: RTCSessionDescriptionInit;
}

export interface AnswerPayload {
  targetPeerId: string;
  answer: RTCSessionDescriptionInit;
}

export interface IcePayload {
  targetPeerId: string;
  candidate: RTCIceCandidateInit;
}

export interface RtcOfferEvent {
  fromPeerId: string;
  offer: RTCSessionDescriptionInit;
}

export interface RtcAnswerEvent {
  fromPeerId: string;
  answer: RTCSessionDescriptionInit;
}

export interface RtcIceEvent {
  fromPeerId: string;
  candidate: RTCIceCandidateInit;
}

export interface RtcErrorPayload {
  error: string;
  targetPeerId?: string;
}
