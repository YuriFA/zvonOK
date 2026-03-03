export type PeerConnectionState =
  | 'new'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'closed';

export interface RemoteStreamEvent {
  peerId: string;
  stream: MediaStream;
}

export interface IceCandidateEvent {
  peerId: string;
  candidate: RTCIceCandidateInit;
}

export type RemoteStreamCallback = (event: RemoteStreamEvent) => void;
export type IceCandidateCallback = (event: IceCandidateEvent) => void;
export type PeerStateCallback = (peerId: string, state: PeerConnectionState) => void;

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

export class WebRTCManager {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private remoteStreams: Map<string, MediaStream> = new Map();

  private remoteStreamCallbacks: Set<RemoteStreamCallback> = new Set();
  private iceCandidateCallbacks: Set<IceCandidateCallback> = new Set();
  private peerStateCallbacks: Set<PeerStateCallback> = new Set();

  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
    // Add tracks to all existing connections
    this.peerConnections.forEach((pc) => {
      this.addLocalTracksToConnection(pc);
    });
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  createPeerConnection(peerId: string): RTCPeerConnection {
    if (this.peerConnections.has(peerId)) {
      return this.peerConnections.get(peerId)!;
    }

    const pc = new RTCPeerConnection(rtcConfig);

    // Add local tracks
    this.addLocalTracksToConnection(pc);

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.iceCandidateCallbacks.forEach((callback) => {
          callback({
            peerId,
            candidate: event.candidate!.toJSON(),
          });
        });
      }
    };

    // Handle remote tracks
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (remoteStream) {
        this.remoteStreams.set(peerId, remoteStream);
        this.remoteStreamCallbacks.forEach((callback) => {
          callback({ peerId, stream: remoteStream });
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState as PeerConnectionState;
      this.peerStateCallbacks.forEach((callback) => {
        callback(peerId, state);
      });
    };

    // Handle ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      // Map ICE state to connection state
      let state: PeerConnectionState;
      switch (iceState) {
        case 'new':
          state = 'new';
          break;
        case 'checking':
          state = 'connecting';
          break;
        case 'connected':
        case 'completed':
          state = 'connected';
          break;
        case 'disconnected':
          state = 'disconnected';
          break;
        case 'failed':
          state = 'failed';
          break;
        case 'closed':
          state = 'closed';
          break;
        default:
          state = 'new';
      }
      this.peerStateCallbacks.forEach((callback) => {
        callback(peerId, state);
      });
    };

    this.peerConnections.set(peerId, pc);
    return pc;
  }

  getPeerConnection(peerId: string): RTCPeerConnection | undefined {
    return this.peerConnections.get(peerId);
  }

  getRemoteStream(peerId: string): MediaStream | undefined {
    return this.remoteStreams.get(peerId);
  }

  getAllRemoteStreams(): Map<string, MediaStream> {
    return new Map(this.remoteStreams);
  }

  closePeerConnection(peerId: string): void {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
    this.remoteStreams.delete(peerId);
  }

  closeAll(): void {
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.remoteStreams.clear();
  }

  private addLocalTracksToConnection(pc: RTCPeerConnection): void {
    if (!this.localStream) return;

    this.localStream.getTracks().forEach((track) => {
      // Check if track is already in connection
      const senders = pc.getSenders();
      const existingSender = senders.find(
        (sender) => sender.track?.kind === track.kind
      );

      if (!existingSender) {
        pc.addTrack(track, this.localStream!);
      }
    });
  }

  // Event subscriptions
  onRemoteStream(callback: RemoteStreamCallback): () => void {
    this.remoteStreamCallbacks.add(callback);
    return () => {
      this.remoteStreamCallbacks.delete(callback);
    };
  }

  onIceCandidate(callback: IceCandidateCallback): () => void {
    this.iceCandidateCallbacks.add(callback);
    return () => {
      this.iceCandidateCallbacks.delete(callback);
    };
  }

  onPeerStateChange(callback: PeerStateCallback): () => void {
    this.peerStateCallbacks.add(callback);
    return () => {
      this.peerStateCallbacks.delete(callback);
    };
  }

  // Get current peer IDs
  getPeerIds(): string[] {
    return Array.from(this.peerConnections.keys());
  }

  // Check if peer connection exists
  hasPeerConnection(peerId: string): boolean {
    return this.peerConnections.has(peerId);
  }
}

export const webrtcManager = new WebRTCManager();
