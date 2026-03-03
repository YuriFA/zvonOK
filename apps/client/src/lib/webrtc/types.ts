// Peer connection info for UI
export interface PeerConnectionInfo {
  peerId: string;
  state: 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';
  stream: MediaStream | null;
}
