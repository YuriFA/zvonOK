import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { useRoom } from '@/features/room/hooks/use-room';
import { useEndRoom } from '@/features/room/hooks/use-end-room';
import { useAuth } from '@/features/auth/contexts/auth.context';
import { ArrowLeft, Users, Calendar, Wifi, WifiOff, VideoOff } from 'lucide-react';
import { Link } from 'react-router';
import { wsManager } from '@/lib/websocket/manager';
import type { ConnectionStatus, PeerInfo, WebRTCOfferEvent, WebRTCAnswerEvent, WebRTCIceEvent, MediaStateChangedPayload } from '@/lib/websocket/types';
import { mediaManager } from '@/lib/media/manager';
import { webrtcManager } from '@/lib/webrtc/manager';
import type { PeerConnectionState } from '@/lib/webrtc/manager';
import { LocalVideo } from '@/components/local-video';
import { RemoteVideo } from '@/components/remote-video';
import { useMediaControls } from '@/features/media/hooks/use-media-controls';
import { MediaControls } from '@/features/media/components/media-controls';
import { DeviceSettingsPanel } from '@/features/media/components/device-settings-panel';

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

  // Media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [videoUnavailableReason, setVideoUnavailableReason] = useState<string | null>(null);
  const mediaControls = useMediaControls();

  // WebRTC state
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [peerStates, setPeerStates] = useState<Map<string, PeerConnectionState>>(new Map());
  const [peerMediaStates, setPeerMediaStates] = useState<Map<string, { isVideoEnabled: boolean; isAudioEnabled: boolean }>>(new Map());
  const [remoteMediaElements, setRemoteMediaElements] = useState<Map<string, HTMLVideoElement>>(new Map());

  const handleRemoteMediaElement = useCallback((peerId: string, element: HTMLVideoElement | null) => {
    setRemoteMediaElements((prev) => {
      const next = new Map(prev);
      if (element) {
        next.set(peerId, element);
      } else {
        next.delete(peerId);
      }
      return next;
    });
  }, []);

  const primaryRemoteMediaElement = remoteMediaElements.values().next().value ?? null;

  const handleEndRoom = () => {
    if (!room || !user || room.ownerId !== user.id) return;
    endRoom.mutate(room.id);
  };

  // Toggle handlers with media state sync
  const handleToggleVideo = () => {
    mediaControls.toggleVideo();
    wsManager.emit('media:state', {
      isVideoEnabled: !mediaControls.isVideoEnabled,
      isAudioEnabled: mediaControls.isAudioEnabled,
    });
  };

  const handleToggleAudio = () => {
    mediaControls.toggleAudio();
    wsManager.emit('media:state', {
      isVideoEnabled: mediaControls.isVideoEnabled,
      isAudioEnabled: !mediaControls.isAudioEnabled,
    });
  };

  // WebSocket connection
  useEffect(() => {
    if (!room) return;

    // Connect to WebSocket
    wsManager.connect();

    // Subscribe to status changes
    const unsubscribeStatus = wsManager.onStatusChange(setWsStatus);

    // Handle room joined - create peer connections for existing peers
    // NOTE: We do NOT create offers here - existing peers will send us offers
    const handleRoomJoined = (data: { peerId: string; peers: PeerInfo[] }) => {
      console.log('[WS] Room joined:', data);
      setPeers(data.peers);
      // Create peer connections for existing peers (they will send us offers)
      data.peers.forEach((peer) => {
        webrtcManager.createPeerConnection(peer.id);
      });
    };

    // Handle peer joined - create peer connection and initiate offer
    // We (existing peer) create the offer to the new peer
    const handlePeerJoined = async (data: { peerId: string; userInfo: { username: string } }) => {
      console.log('[WS] Peer joined:', data);
      setPeers((prev) => [...prev, { id: data.peerId, userInfo: data.userInfo }]);
      // Create peer connection for new peer
      webrtcManager.createPeerConnection(data.peerId);
      // As existing peer, we initiate the offer
      await webrtcManager.createOffer(data.peerId);
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
    const handleIceCandidate = async (data: WebRTCIceEvent) => {
      console.log('[WS] ICE candidate received from:', data.fromPeerId);
      await webrtcManager.addIceCandidate(data.fromPeerId, data.candidate);
    };

    // Handle incoming offer from peer
    const handleOffer = async (data: WebRTCOfferEvent) => {
      console.log('[WS] Offer received from:', data.fromPeerId);
      await webrtcManager.handleOffer(data.fromPeerId, data.offer);
    };

    // Handle incoming answer from peer
    const handleAnswer = async (data: WebRTCAnswerEvent) => {
      console.log('[WS] Answer received from:', data.fromPeerId);
      await webrtcManager.handleAnswer(data.fromPeerId, data.answer);
    };

    // Handle errors
    const handleError = (data: { code: string; message: string }) => {
      console.error('[WS] Error:', data);
    };

    // Handle media state changes from other peers
    const handleMediaStateChanged = (data: MediaStateChangedPayload) => {
      console.log('[WS] Media state changed from:', data.peerId, data);
      setPeerMediaStates((prev) =>
        new Map(prev).set(data.peerId, {
          isVideoEnabled: data.isVideoEnabled,
          isAudioEnabled: data.isAudioEnabled,
        })
      );
    };

    // Subscribe to events
    wsManager.on('room:joined', handleRoomJoined);
    wsManager.on('peer:joined', handlePeerJoined);
    wsManager.on('peer:left', handlePeerLeft);
    wsManager.on('webrtc:ice', handleIceCandidate);
    wsManager.on('webrtc:offer', handleOffer);
    wsManager.on('webrtc:answer', handleAnswer);
    wsManager.on('media:state_changed', handleMediaStateChanged);
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
      wsManager.off('webrtc:offer', handleOffer);
      wsManager.off('webrtc:answer', handleAnswer);
      wsManager.off('media:state_changed', handleMediaStateChanged);
      wsManager.off('error', handleError);
      wsManager.leaveRoom();
    };
  }, [room]);

  // Media stream - start on mount, stop on unmount
  useEffect(() => {
    const startMedia = async () => {
      try {
        const result = await mediaManager.startStreamWithFallback();
        setLocalStream(result.stream);
        setIsAudioOnly(result.isAudioOnly);
        setVideoUnavailableReason(result.videoError ?? null);
        webrtcManager.setLocalStream(result.stream);

        if (result.isAudioOnly) {
          console.log('[Room] Running in audio-only mode:', result.videoError);
        }
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
      setIsAudioOnly(false);
      setVideoUnavailableReason(null);
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

    // Handle offer creation - send to server for forwarding
    const unsubOffer = webrtcManager.onOffer(({ peerId, offer }) => {
      console.log('[WebRTC] Offer created for:', peerId);
      wsManager.emit('webrtc:offer', {
        targetPeerId: peerId,
        offer,
      });
    });

    // Handle answer creation - send to server for forwarding
    const unsubAnswer = webrtcManager.onAnswer(({ peerId, answer }) => {
      console.log('[WebRTC] Answer created for:', peerId);
      wsManager.emit('webrtc:answer', {
        targetPeerId: peerId,
        answer,
      });
    });

    return () => {
      unsubRemoteStream();
      unsubIceCandidate();
      unsubPeerState();
      unsubOffer();
      unsubAnswer();
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
          <div className="flex items-center gap-2">
            <DeviceSettingsPanel
              variant="popover"
              remoteVideoElement={primaryRemoteMediaElement}
              isVideoEnabled={mediaControls.isVideoEnabled}
              isAudioEnabled={mediaControls.isAudioEnabled}
            />
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

      {/* Audio-only mode warning */}
      {isAudioOnly && !mediaError && (
        <div className="container mx-auto px-4 py-4">
          <div className="rounded-md bg-yellow-500/15 p-3 text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
            <VideoOff className="size-4" />
            <span>
              {videoUnavailableReason || 'Camera unavailable'}. Running in audio-only mode.
            </span>
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
                isVideoEnabled={mediaControls.isVideoEnabled}
                isAudioEnabled={mediaControls.isAudioEnabled}
                className="w-full aspect-video"
                showControls={false}
              />
              {/* Media controls overlay */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                <MediaControls
                  isVideoEnabled={mediaControls.isVideoEnabled}
                  isAudioEnabled={mediaControls.isAudioEnabled}
                  onToggleVideo={handleToggleVideo}
                  onToggleAudio={handleToggleAudio}
                />
              </div>
            </div>
          )}

          {/* Remote videos */}
          {peers.map((peer) => {
            const stream = remoteStreams.get(peer.id);
            const state = peerStates.get(peer.id);
            const peerMediaState = peerMediaStates.get(peer.id);
            return (
              <div key={peer.id} className="relative">
                <RemoteVideo
                  stream={stream ?? null}
                  username={peer.userInfo.username}
                  isVideoEnabled={peerMediaState?.isVideoEnabled ?? true}
                  isAudioEnabled={peerMediaState?.isAudioEnabled ?? true}
                  onMediaElement={(element) => handleRemoteMediaElement(peer.id, element)}
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
