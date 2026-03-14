import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { useRoom } from '@/features/room/hooks/use-room';
import { useEndRoom } from '@/features/room/hooks/use-end-room';
import { useAuth } from '@/features/auth/contexts/auth.context';
import { ArrowLeft, Users, Calendar, Wifi, WifiOff } from 'lucide-react';
import { Link } from 'react-router';
import { mediaManager } from '@/lib/media/manager';
import { LocalVideo } from '@/components/local-video';
import { RemoteVideo } from '@/components/remote-video';
import { VideoGrid, VideoTile } from '@/components/video-grid';
import { ParticipantsList, type Participant } from '@/components/room/ParticipantsList';
import { useMediaControls } from '@/features/media/hooks/use-media-controls';
import { MediaControls } from '@/features/media/components/media-controls';
import { DeviceSettingsPanel } from '@/features/media/components/device-settings-panel';
import { DeviceSelector } from '@/features/media/components/device-selector';
import { CopyLink } from '@/components/ui/copy-link';
import { useMediasoup, type RemotePeerMedia } from '@/hooks/use-mediasoup';
import { useQualityStats } from '@/hooks/use-quality-stats';
import { useActiveSpeaker } from '@/features/room/hooks/use-active-speaker';

type RoomViewState = 'prejoin' | 'active';

interface SavedMediaSetup {
  video: string | null;
  audio: string | null;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

export const RoomPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: room, isLoading, error } = useRoom(slug || '');

  const endRoom = useEndRoom({
    onSuccess: () => navigate('/'),
  });

  const [viewState, setViewState] = useState<RoomViewState>('prejoin');
  // Preserve device selection from lobby preview when joining
  const savedDeviceIds = useRef<SavedMediaSetup | null>(null);

  const handleJoin = useCallback(() => {
    savedDeviceIds.current = {
      video: mediaManager.getVideoDeviceId(),
      audio: mediaManager.getAudioDeviceId(),
      isVideoEnabled: mediaManager.isPreferredVideoEnabled(),
      isAudioEnabled: mediaManager.isPreferredAudioEnabled(),
    };
    setViewState('active');
  }, []);

  // Media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isMediaInitialized, setIsMediaInitialized] = useState(false);
  const mediaControls = useMediaControls();
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

  const { state: sfuState, remotePeers, toggleVideoWithHardware, toggleAudioWithHardware, kickPeer, wasKicked } = useMediasoup({
    roomId: room?.id,
    roomOwnerId: room?.ownerId,
    localStream,
    enabled: !!room && isMediaInitialized && viewState === 'active',
  });

  const { peerStats } = useQualityStats({ enabled: sfuState.connectionState === 'connected' });

  const localUserId = user?.id ?? 'local';

  // Active speaker detection
  const activeSpeakerId = useActiveSpeaker({
    remotePeers,
    localUserId,
    localStream,
    enabled: sfuState.connectionState === 'connected',
  });

  const handleEndRoom = () => {
    if (!room || !user || room.ownerId !== user.id) return;
    endRoom.mutate(room.id);
  };

  // Toggle handlers with media state sync
  const handleToggleVideo = async () => {
    const nextVideoEnabled = !mediaControls.isVideoEnabled;

    // Update UI state immediately for responsiveness
    mediaControls.setVideoEnabled(nextVideoEnabled);

    // Use hardware-aware toggle that properly stops/restarts camera
    const success = await toggleVideoWithHardware(nextVideoEnabled);

    if (!success && nextVideoEnabled) {
      // Failed to re-acquire camera - revert UI state
      mediaControls.setVideoEnabled(false);
    } else if (success) {
      // Update audio-only state based on video availability
    }
  };

  const handleToggleAudio = async () => {
    const nextAudioEnabled = !mediaControls.isAudioEnabled;

    // Update UI state immediately for responsiveness
    mediaControls.setAudioEnabled(nextAudioEnabled);

    // Use hardware-aware toggle that properly stops/restarts microphone
    const success = await toggleAudioWithHardware(nextAudioEnabled);

    if (!success && nextAudioEnabled) {
      // Failed to re-acquire microphone - revert UI state
      mediaControls.setAudioEnabled(false);
    }
  };

  // Build participants list from local user + remote peers
  const participants: Participant[] = useMemo(() => {
    const localParticipant: Participant = {
      id: user?.id ?? 'local',
      userId: user?.id,
      username: user?.username ?? 'You',
      isMuted: !mediaControls.isAudioEnabled,
      isVideoOff: !mediaControls.isVideoEnabled,
      isConnected: sfuState.connectionState === 'connected',
    };

    const remoteParticipants: Participant[] = remotePeers.map((peer: RemotePeerMedia) => {
      const qualityData = peerStats.get(peer.userId);
      return {
        id: peer.userId,
        userId: peer.userId,
        username: peer.username,
        isMuted: !peer.isAudioEnabled,
        isVideoOff: !peer.isVideoEnabled,
        isConnected: true,
        qualityScore: qualityData?.score,
        qualityStats: qualityData?.stats,
      };
    });

    return [localParticipant, ...remoteParticipants];
  }, [user?.id, user?.username, mediaControls.isAudioEnabled, mediaControls.isVideoEnabled, sfuState.connectionState, remotePeers, peerStats]);

  const handleKickParticipant = (participantId: string) => {
    kickPeer(participantId);
  };

  useEffect(() => {
    if (!wasKicked) {
      return;
    }

    mediaManager.stopStream();
    setLocalStream(null);
  }, [wasKicked]);

  // Media stream - start after join, stop on unmount or leaving active state
  useEffect(() => {
    if (viewState !== 'active') return;

    let isCancelled = false;

    const startMedia = async () => {
      setIsMediaInitialized(false);
      setMediaError(null);

      // Preserve device IDs from lobby preview for video re-acquisition
      const ids = savedDeviceIds.current;
      if (ids?.video) {
        mediaManager.setSelectedVideoDeviceId(ids.video);
      }
      if (ids?.audio) {
        mediaManager.setSelectedAudioDeviceId(ids.audio);
      }

      // Build constraints using device IDs saved from the lobby preview
      const constraints = ids
        ? {
          video: ids.isVideoEnabled
            ? ids.video
              ? { deviceId: { exact: ids.video }, width: { ideal: 1280 }, height: { ideal: 720 } }
              : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' as const }
            : false,
          audio: ids.isAudioEnabled
            ? ids.audio
              ? { deviceId: { exact: ids.audio }, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
              : { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            : false,
        }
        : undefined;

      try {
        const stream = await mediaManager.startStream(constraints);

        if (isCancelled) {
          mediaManager.stopStream();
          return;
        }

        setLocalStream(stream);
      } catch (err) {
        if (isCancelled) {
          return;
        }

        const message =
          err instanceof Error ? err.message : 'Failed to access camera/microphone';
        setMediaError(message);
        console.error('Failed to start media stream:', err);
      } finally {
        if (!isCancelled) {
          setIsMediaInitialized(true);
        }
      }
    };

    void startMedia();

    return () => {
      isCancelled = true;
      mediaManager.stopStream();
      setLocalStream(null);
      setMediaError(null);
      setIsMediaInitialized(false);
    };
  }, [viewState]);

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
  const roomUrl = `${window.location.origin}/room/${room.slug}`;

  if (viewState === 'prejoin') {
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
          </div>
        </header>

        {/* Main content */}
        <main className="flex flex-1 flex-col p-4">
          {/* Room info */}
          <div className="mb-6 flex gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="size-4" />
              <span>Up to {room.maxParticipants} participants</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="size-4" />
              <span>Created {new Date(room.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="mx-auto grid w-full max-w-2xl gap-6">
            {/* Device selector */}
            <div>
              <h2 className="mb-4 text-xl font-semibold">Setup Your Devices</h2>
              <DeviceSelector />
            </div>

            {/* Share link */}
            <div>
              <h2 className="mb-2 text-xl font-semibold">Share Room Link</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Copy this link and share it with others to invite them to the room.
              </p>
              <CopyLink url={roomUrl} />
            </div>

            {/* Join button */}
            <div className="flex justify-end">
              <Button size="lg" onClick={handleJoin}>
                Join Room
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

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

      {wasKicked && (
        <div className="container mx-auto px-4 py-4">
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            You were removed from the room by the owner.
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex flex-1 flex-col p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0">
            {/* Video grid */}
            <VideoGrid className="mb-4">
              {/* Local video — always shown once media init is done */}
              {isMediaInitialized && (
                <VideoTile isActiveSpeaker={activeSpeakerId === localUserId}>
                  <LocalVideo
                    stream={localStream}
                    username={user?.username}
                    isVideoEnabled={!mediaError && mediaControls.isVideoEnabled}
                    isAudioEnabled={!mediaError && mediaControls.isAudioEnabled}
                    className="h-full w-full"
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
                </VideoTile>
              )}

              {/* Remote videos */}
              {remotePeers.map((peer) => {
                return (
                  <VideoTile key={peer.userId} isActiveSpeaker={activeSpeakerId === peer.userId}>
                    <RemoteVideo
                      stream={peer.stream}
                      username={peer.username}
                      isVideoEnabled={peer.isVideoEnabled}
                      isAudioEnabled={peer.isAudioEnabled}
                      onMediaElement={(element) => handleRemoteMediaElement(peer.userId, element)}
                      className="h-full w-full"
                    />
                    {sfuState.connectionState !== 'connected' && (
                      <div className="absolute top-2 right-2 rounded bg-black/50 px-1.5 py-0.5 text-xs text-white">
                        {sfuState.connectionState === 'connecting' ? 'Connecting...' : sfuState.connectionState}
                      </div>
                    )}
                  </VideoTile>
                );
              })}
            </VideoGrid>

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
              {sfuState.connectionState === 'connected' ? (
                <Wifi className="size-4 text-green-500" />
              ) : sfuState.connectionState === 'connecting' ? (
                <Wifi className="size-4 animate-pulse text-yellow-500" />
              ) : (
                <WifiOff className="size-4 text-red-500" />
              )}
              <span className="capitalize">
                {sfuState.connectionState === 'connecting'
                  ? 'Connecting...'
                  : sfuState.connectionState === 'connected'
                    ? 'Connected'
                    : sfuState.connectionState === 'failed'
                      ? 'Connection failed'
                      : 'Disconnected'}
              </span>
            </div>

          </div>

          <aside className="min-w-0">
            <ParticipantsList
              participants={participants}
              currentUserId={user?.id}
              roomOwnerId={room.ownerId}
              onKickParticipant={handleKickParticipant}
              className="lg:sticky lg:top-4"
            />
          </aside>
        </div>
      </main>
    </div>
  );
}
