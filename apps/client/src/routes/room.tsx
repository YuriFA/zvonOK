import { useParams } from 'react-router';
import { useRoom } from '@/features/room/hooks/use-room';
import { PrejoinView } from '@/features/room/components/prejoin-view';
import { useState, useEffect, useCallback } from 'react';
import { RoomView } from '@/features/room/components/room-view';
import { CallEndedView } from '@/features/room/components/call-ended-view';
import { MediaStreamProvider } from '@/features/media/contexts/media-stream.context';
import { MediaManagerProvider } from '@/features/media/contexts/media-manager.context';
import { SfuManagerProvider } from '@/features/sfu/contexts/sfu-manager.context';
import { sfuManager } from '@/lib/sfu/manager';
import { mediaManager } from '@/lib/media/manager';
import { LinkButton } from '@/components/ui/link-button';
import { useAuth } from '@/features/auth/contexts/auth.context';
import { loadGuestDisplayName, saveGuestDisplayName } from '@/lib/utils/display-name';

type RoomViewState = 'prejoin' | 'active' | 'ended';

export const RoomPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [viewState, setViewState] = useState<RoomViewState>('prejoin');
  const { user } = useAuth();

  const { data: room, isLoading, error } = useRoom(slug || '');

  const [displayName, setDisplayName] = useState(() => user?.username ?? loadGuestDisplayName());

  useEffect(() => {
    if (!user) {
      setDisplayName(loadGuestDisplayName());
    }
  }, [user]);

  // Guard: if the room is ended on load (or after refetch), transition immediately
  useEffect(() => {
    if (room?.status === 'ended') {
      setViewState('ended');
    }
  }, [room?.status]);

  // Listen for sfu:room-ended while in active call
  const handleRoomEnded = useCallback(() => {
    setViewState('ended');
  }, []);

  useEffect(() => {
    if (viewState !== 'active') return;
    const unsubscribe = sfuManager.onRoomEnded(handleRoomEnded);
    return unsubscribe;
  }, [viewState, handleRoomEnded]);

  const handleJoin = () => {
    if (!user) {
      saveGuestDisplayName(displayName);
    }
    setViewState('active');
  };

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
        <LinkButton to="/">
          Back to Home
        </LinkButton>
      </div>
    );
  }

  // Ended rooms render outside media/SFU providers — no resource initialization
  if (viewState === 'ended') {
    return <CallEndedView room={room} />;
  }

  const roomUrl = `${window.location.origin}/room/${room.slug}`;

  return (
    <MediaManagerProvider manager={mediaManager}>
      <SfuManagerProvider manager={sfuManager}>
        <MediaStreamProvider>
          {viewState === 'prejoin' ? (
            <PrejoinView
              room={room}
              roomUrl={roomUrl}
              displayName={displayName}
              onDisplayNameChange={setDisplayName}
              onJoin={handleJoin}
            />
          ) : (
            <RoomView room={room} displayName={displayName} />
          )}
        </MediaStreamProvider>
      </SfuManagerProvider>
    </MediaManagerProvider>
  );
};
