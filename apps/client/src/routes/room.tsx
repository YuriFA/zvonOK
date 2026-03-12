import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { useRoom } from '@/features/room/hooks/use-room';
import { useEndRoom } from '@/features/room/hooks/use-end-room';
import { useAuth } from '@/features/auth/contexts/auth.context';
import { ArrowLeft, Users, Calendar, Wifi, WifiOff, VideoOff } from 'lucide-react';
import { Link } from 'react-router';
import { mediaManager } from '@/lib/media/manager';
import { LocalVideo } from '@/components/local-video';
import { RemoteVideo } from '@/components/remote-video';
import { ParticipantsList, type Participant } from '@/components/room/ParticipantsList';
import { useMediaControls } from '@/features/media/hooks/use-media-controls';
import { MediaControls } from '@/features/media/components/media-controls';
import { DeviceSettingsPanel } from '@/features/media/components/device-settings-panel';
import { useMediasoup, type RemotePeerMedia } from '@/hooks/use-mediasoup';

export const RoomPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: room, isLoading, error } = useRoom(slug || '');

  const endRoom = useEndRoom({
    onSuccess: () => navigate('/'),
  });

  // Media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [videoUnavailableReason, setVideoUnavailableReason] = useState<string | null>(null);
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

  const { state: sfuState, remotePeers, syncProducerState, kickPeer, wasKicked } = useMediasoup({
    roomId: room?.id,
    roomOwnerId: room?.ownerId,
    localStream,
    enabled: !!room,
  });

  const handleEndRoom = () => {
    if (!room || !user || room.ownerId !== user.id) return;
    endRoom.mutate(room.id);
  };

  // Toggle handlers with media state sync
  const handleToggleVideo = () => {
    const nextVideoEnabled = !mediaControls.isVideoEnabled;
    mediaControls.toggleVideo();
    syncProducerState('video', nextVideoEnabled);
  };

  const handleToggleAudio = () => {
    const nextAudioEnabled = !mediaControls.isAudioEnabled;
    mediaControls.toggleAudio();
    syncProducerState('audio', nextAudioEnabled);
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

    const remoteParticipants: Participant[] = remotePeers.map((peer: RemotePeerMedia) => ({
      id: peer.userId,
      userId: peer.userId,
      username: peer.username,
      isMuted: !peer.isAudioEnabled,
      isVideoOff: !peer.isVideoEnabled,
      isConnected: true,
    }));

    return [localParticipant, ...remoteParticipants];
  }, [user?.id, user?.username, mediaControls.isAudioEnabled, mediaControls.isVideoEnabled, sfuState.connectionState, remotePeers]);

  const handleKickParticipant = (participantId: string) => {
    kickPeer(participantId);
  };

  useEffect(() => {
    if (!wasKicked) {
      return;
    }

    mediaManager.stopStream();
    setLocalStream(null);
    setIsAudioOnly(false);
    setVideoUnavailableReason(null);
  }, [wasKicked]);

  // Media stream - start on mount, stop on unmount
  useEffect(() => {
    const startMedia = async () => {
      try {
        const result = await mediaManager.startStreamWithFallback();
        setLocalStream(result.stream);
        setIsAudioOnly(result.isAudioOnly);
        setVideoUnavailableReason(result.videoError ?? null);

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
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
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
          {remotePeers.map((peer) => {
            return (
              <div key={peer.userId} className="relative">
                <RemoteVideo
                  stream={peer.stream}
                  username={peer.username}
                  isVideoEnabled={peer.isVideoEnabled}
                  isAudioEnabled={peer.isAudioEnabled}
                  onMediaElement={(element) => handleRemoteMediaElement(peer.userId, element)}
                  className="w-full aspect-video"
                />
                {sfuState.connectionState !== 'connected' && (
                  <div className="absolute top-2 right-2 rounded bg-black/50 px-1.5 py-0.5 text-xs text-white">
                    {sfuState.connectionState === 'connecting' ? 'Connecting...' : sfuState.connectionState}
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
