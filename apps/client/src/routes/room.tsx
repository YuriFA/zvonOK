import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { useRoom, useEndRoom } from '@/features/room/hooks';
import { useAuth } from '@/features/auth/contexts/auth.context';
import { ArrowLeft, Users, Calendar, Wifi, WifiOff, Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { Link } from 'react-router';
import { wsManager, type ConnectionStatus, type PeerInfo } from '@/lib/websocket';
import { mediaManager } from '@/lib/media';
import { webrtcManager, type PeerConnectionState } from '@/lib/webrtc';
import { LocalVideo } from '@/components/local-video';
import { RemoteVideo } from '@/components/remote-video';

export const RoomPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: room, isLoading, error } = useRoom(slug || '');

  const endRoom = useEndRoom({
    onSuccess: () => navigate('/'),
  });

  // WebSocket state
  const [wsStatus, setWsStatus] = useState<ConnectionStatus>('disconnected');
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [myPeerId, setMyPeerId] = useState<string | null>(null);

  // Media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // WebRTC state
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [peerStates, setPeerStates] = useState<Map<string, PeerConnectionState>>(new Map());

  const handleEndRoom = () => {
    if (!room || !user || room.ownerId !== user.id) return;
    endRoom.mutate(room.id);
  };

  // Toggle handlers
  const toggleVideo = () => {
    mediaManager.toggleVideo(!isVideoEnabled);
    setIsVideoEnabled(!isVideoEnabled);
  };

  const toggleAudio = () => {
    mediaManager.toggleAudio(!isAudioEnabled);
    setIsAudioEnabled(!isAudioEnabled);
  };

  // WebSocket connection
  useEffect(() => {
    if (!room) return;

    // Connect to WebSocket
    wsManager.connect();

    // Subscribe to status changes
    const unsubscribeStatus = wsManager.onStatusChange(setWsStatus);

    // Handle room joined - create peer connections for existing peers
    const handleRoomJoined = (data: { peerId: string; peers: PeerInfo[] }) => {
      console.log('[WS] Room joined:', data);
      setMyPeerId(data.peerId);
      setPeers(data.peers);
      // Create peer connections for existing peers
      data.peers.forEach((peer) => {
        webrtcManager.createPeerConnection(peer.id);
      });
    };

    // Handle peer joined - create peer connection
    const handlePeerJoined = (data: { peerId: string; userInfo: { username: string } }) => {
      console.log('[WS] Peer joined:', data);
      setPeers((prev) => [...prev, { id: data.peerId, userInfo: data.userInfo }]);
      // Create peer connection for new peer
      webrtcManager.createPeerConnection(data.peerId);
    };

    // Handle peer left - close peer connection
    const handlePeerLeft = (data: { peerId: string }) => {
      console.log('[WS] Peer left:', data);
      setPeers((prev) => prev.filter((p) => p.id !== data.peerId));
      // Close peer connection
      webrtcManager.closePeerConnection(data.peerId);
      // Remove remote stream
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.delete(data.peerId);
        return next;
      });
    };

    // Handle incoming ICE candidates from server
    const handleIceCandidate = (data: { targetPeerId: string; candidate: RTCIceCandidateInit }) => {
      console.log('[WS] ICE candidate received for:', data.targetPeerId);
      const pc = webrtcManager.getPeerConnection(data.targetPeerId);
      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    };

    // Handle errors
    const handleError = (data: { message: string }) => {
      console.error('[WS] Error:', data);
    };

    // Subscribe to events
    wsManager.on('room:joined', handleRoomJoined);
    wsManager.on('peer:joined', handlePeerJoined);
    wsManager.on('peer:left', handlePeerLeft);
    wsManager.on('webrtc:ice', handleIceCandidate);
    wsManager.on('error', handleError);

    // Join room when connected
    const joinWhenConnected = () => {
      if (wsManager.isConnected()) {
        wsManager.joinRoom(room.slug);
      } else {
        setTimeout(joinWhenConnected, 100);
      }
    };
    joinWhenConnected();

    // Cleanup on unmount
    return () => {
      unsubscribeStatus();
      wsManager.off('room:joined', handleRoomJoined);
      wsManager.off('peer:joined', handlePeerJoined);
      wsManager.off('peer:left', handlePeerLeft);
      wsManager.off('webrtc:ice', handleIceCandidate);
      wsManager.off('error', handleError);
      wsManager.leaveRoom();
    };
  }, [room]);

  // Media stream - start on mount, stop on unmount
  useEffect(() => {
    const startMedia = async () => {
      try {
        const stream = await mediaManager.startStream();
        setLocalStream(stream);
        webrtcManager.setLocalStream(stream);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to access camera/microphone';
        setMediaError(message);
        console.error('Failed to start media stream:', err);
      }
    };

    startMedia();

    return () => {
      mediaManager.stopStream();
      setLocalStream(null);
      webrtcManager.closeAll();
    };
  }, []);

  // WebRTC manager event handlers
  useEffect(() => {
    // Handle remote streams
    const unsubRemoteStream = webrtcManager.onRemoteStream(({ peerId, stream }) => {
      console.log('[WebRTC] Remote stream received from:', peerId);
      setRemoteStreams((prev) => new Map(prev).set(peerId, stream));
    });

    // Handle ICE candidates - send to server
    const unsubIceCandidate = webrtcManager.onIceCandidate(({ peerId, candidate }) => {
      console.log('[WebRTC] ICE candidate for:', peerId);
      wsManager.emit('webrtc:ice', {
        targetPeerId: peerId,
        candidate,
      });
    });

    // Handle peer connection state changes
    const unsubPeerState = webrtcManager.onPeerStateChange((peerId, state) => {
      console.log('[WebRTC] Peer', peerId, 'state:', state);
      setPeerStates((prev) => new Map(prev).set(peerId, state));
    });

    return () => {
      unsubRemoteStream();
      unsubIceCandidate();
      unsubPeerState();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading room...</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error?.message || 'Room not found'}</p>
        <Button asChild>
          <Link to="/">Back to Lobby</Link>
        </Button>
      </div>
    );
  }

  const isOwner = user?.id === room.ownerId;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{room.name || 'Unnamed Room'}</h1>
              <p className="text-sm text-muted-foreground">Code: {room.slug}</p>
            </div>
          </div>
          {isOwner && (
            <Button
              variant="destructive"
              onClick={handleEndRoom}
              disabled={endRoom.isPending}
            >
              {endRoom.isPending ? 'Ending...' : 'End Room'}
            </Button>
          )}
        </div>
      </header>

      {/* Error message from mutation */}
      {endRoom.error && (
        <div className="container mx-auto px-4 py-4">
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            Failed to end room
          </div>
        </div>
      )}

      {/* Media access error */}
      {mediaError && (
        <div className="container mx-auto px-4 py-4">
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            Camera/microphone unavailable: {mediaError}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex flex-1 flex-col p-4">
        {/* Video grid */}
        <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {/* Local video */}
          {localStream && (
            <div className="relative">
              <LocalVideo
                stream={localStream}
                isVideoEnabled={isVideoEnabled}
                isAudioEnabled={isAudioEnabled}
                className="w-full aspect-video"
                showControls={false}
              />
              {/* Media controls overlay */}
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={toggleVideo}
                >
                  {isVideoEnabled ? (
                    <Video className="size-4" />
                  ) : (
                    <VideoOff className="size-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={toggleAudio}
                >
                  {isAudioEnabled ? (
                    <Mic className="size-4" />
                  ) : (
                    <MicOff className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Remote videos */}
          {peers.map((peer) => {
            const stream = remoteStreams.get(peer.id);
            const state = peerStates.get(peer.id);
            return (
              <div key={peer.id} className="relative">
                <RemoteVideo
                  stream={stream ?? null}
                  username={peer.userInfo.username}
                  className="w-full aspect-video"
                />
                {/* Connection state indicator */}
                {state && state !== 'connected' && (
                  <div className="absolute top-2 right-2 rounded bg-black/50 px-1.5 py-0.5 text-xs text-white">
                    {state === 'connecting' ? 'Connecting...' : state}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Room info */}
        <div className="mb-4 flex gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="size-4" />
            <span>Up to {room.maxParticipants} participants</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="size-4" />
            <span>Created {new Date(room.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-1">
          {wsStatus === 'connected' ? (
            <Wifi className="size-4 text-green-500" />
          ) : wsStatus === 'reconnecting' ? (
            <Wifi className="size-4 animate-pulse text-yellow-500" />
          ) : (
            <WifiOff className="size-4 text-red-500" />
          )}
          <span className="capitalize">
            {wsStatus === 'connecting'
              ? 'Connecting...'
              : wsStatus === 'connected'
                ? 'Connected'
                : 'Disconnected'}
          </span>
        </div>

        {/* Peers */}
        <div className="flex items-center gap-1">
          <span className="text-sm">
            {peers.length === 0
              ? 'No peers'
              : peers.length === 1
                ? '1 peer'
                : `${peers.length} peers`
            }
          </span>
          {peers.length > 0 && (
            <ul className="text-sm">
              {peers.map((peer) => (
                <li key={peer.id} className="truncate">
                  {peer.userInfo.username}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
