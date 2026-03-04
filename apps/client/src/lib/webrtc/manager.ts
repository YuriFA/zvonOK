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

export interface OfferEvent {
  peerId: string;
  offer: RTCSessionDescriptionInit;
}

export interface AnswerEvent {
  peerId: string;
  answer: RTCSessionDescriptionInit;
}

export type RemoteStreamCallback = (event: RemoteStreamEvent) => void;
export type IceCandidateCallback = (event: IceCandidateEvent) => void;
export type PeerStateCallback = (peerId: string, state: PeerConnectionState) => void;
export type OfferCallback = (event: OfferEvent) => void;
export type AnswerCallback = (event: AnswerEvent) => void;

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

  // ICE candidate queue - stores candidates before remote description is set
  private pendingIceCandidates: Map<string, RTCIceCandidateInit[]> = new Map();

  private remoteStreamCallbacks: Set<RemoteStreamCallback> = new Set();
  private iceCandidateCallbacks: Set<IceCandidateCallback> = new Set();
  private peerStateCallbacks: Set<PeerStateCallback> = new Set();
  private offerCallbacks: Set<OfferCallback> = new Set();
  private answerCallbacks: Set<AnswerCallback> = new Set();

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
    this.pendingIceCandidates.delete(peerId);
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

  onOffer(callback: OfferCallback): () => void {
    this.offerCallbacks.add(callback);
    return () => {
      this.offerCallbacks.delete(callback);
    };
  }

  onAnswer(callback: AnswerCallback): () => void {
    this.answerCallbacks.add(callback);
    return () => {
      this.answerCallbacks.delete(callback);
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

  // Offer/Answer exchange methods

  /**
   * Create an offer for a peer connection.
   * Sets local description and notifies offer callbacks.
   */
  async createOffer(peerId: string): Promise<RTCSessionDescriptionInit | null> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      console.error('[WebRTC] No peer connection for:', peerId);
      return null;
    }

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Notify callbacks to send offer via signalling
      this.offerCallbacks.forEach((callback) => {
        callback({ peerId, offer });
      });

      return offer;
    } catch (error) {
      console.error('[WebRTC] Failed to create offer:', error);
      return null;
    }
  }

  /**
   * Handle an incoming offer from a peer.
   * Sets remote description, creates answer, and notifies answer callbacks.
   */
  async handleOffer(
    peerId: string,
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit | null> {
    let pc = this.peerConnections.get(peerId);
    if (!pc) {
      // Create peer connection if it doesn't exist
      pc = this.createPeerConnection(peerId);
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Apply any pending ICE candidates
      await this.applyPendingIceCandidates(peerId);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Notify callbacks to send answer via signalling
      this.answerCallbacks.forEach((callback) => {
        callback({ peerId, answer });
      });

      return answer;
    } catch (error) {
      console.error('[WebRTC] Failed to handle offer:', error);
      return null;
    }
  }

  /**
   * Handle an incoming answer from a peer.
   * Sets remote description and applies pending ICE candidates.
   */
  async handleAnswer(
    peerId: string,
    answer: RTCSessionDescriptionInit
  ): Promise<boolean> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      console.error('[WebRTC] No peer connection for:', peerId);
      return false;
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      // Apply any pending ICE candidates
      await this.applyPendingIceCandidates(peerId);

      return true;
    } catch (error) {
      console.error('[WebRTC] Failed to handle answer:', error);
      return false;
    }
  }

  /**
   * Add an ICE candidate to a peer connection.
   * Queues the candidate if remote description is not set yet.
   */
  async addIceCandidate(
    peerId: string,
    candidate: RTCIceCandidateInit
  ): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      console.error('[WebRTC] No peer connection for:', peerId);
      return;
    }

    // Check if remote description is set
    if (!pc.remoteDescription) {
      // Queue the candidate
      const pending = this.pendingIceCandidates.get(peerId) || [];
      pending.push(candidate);
      this.pendingIceCandidates.set(peerId, pending);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('[WebRTC] Failed to add ICE candidate:', error);
    }
  }

  /**
   * Apply pending ICE candidates after remote description is set.
   */
  private async applyPendingIceCandidates(peerId: string): Promise<void> {
    const pending = this.pendingIceCandidates.get(peerId);
    if (!pending || pending.length === 0) return;

    const pc = this.peerConnections.get(peerId);
    if (!pc) return;

    this.pendingIceCandidates.delete(peerId);

    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('[WebRTC] Failed to apply pending ICE candidate:', error);
      }
    }
  }

  /**
   * Replace a track in all peer connections.
   * Used when switching camera/microphone without renegotiation.
   */
  async replaceTrack(kind: 'video' | 'audio', newTrack: MediaStreamTrack): Promise<boolean> {
    let success = true;

    for (const [peerId, pc] of this.peerConnections) {
      const sender = pc.getSenders().find((s) => s.track?.kind === kind);

      if (sender) {
        try {
          await sender.replaceTrack(newTrack);
        } catch (error) {
          console.error(`[WebRTC] Failed to replace ${kind} track for peer ${peerId}:`, error);
          success = false;
        }
      }
    }

    return success;
  }

  /**
   * Get the current video sender track.
   */
  getVideoTrack(): MediaStreamTrack | null {
    return this.localStream?.getVideoTracks()[0] ?? null;
  }

  /**
   * Get the current audio sender track.
   */
  getAudioTrack(): MediaStreamTrack | null {
    return this.localStream?.getAudioTracks()[0] ?? null;
  }
}

export const webrtcManager = new WebRTCManager();
