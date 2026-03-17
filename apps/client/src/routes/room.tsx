import { useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { useRoom } from '@/features/room/hooks/use-room';
import { Link } from 'react-router';
import { PrejoinView } from '@/features/room/components/prejoin-view';
import { useState } from 'react';
import { RoomView } from '@/features/room/components/room-view';
import { MediaStreamProvider } from '@/features/media/contexts/media-stream.context';
import { MediaManagerProvider } from '@/features/media/contexts/media-manager.context';
import { SfuManagerProvider } from '@/features/sfu/contexts/sfu-manager.context';
import { sfuManager } from '@/lib/sfu/manager';
import { mediaManager } from '@/lib/media/manager';

export const RoomPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [viewState, setViewState] = useState<'prejoin' | 'active'>('prejoin');

  const { data: room, isLoading, error } = useRoom(slug || '');

  const handleJoin = () => {
    setViewState('active');
  }

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

  const roomUrl = `${window.location.origin}/room/${room.slug}`;

  return (
    <MediaManagerProvider manager={mediaManager}>
      <SfuManagerProvider manager={sfuManager}>
        <MediaStreamProvider>
          {viewState === 'prejoin' ? (
            <PrejoinView room={room} roomUrl={roomUrl} onJoin={handleJoin} />
          ) : (
            <RoomView room={room} />
          )}
        </MediaStreamProvider>
      </SfuManagerProvider>
    </MediaManagerProvider>
  );
};
