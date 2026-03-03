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
