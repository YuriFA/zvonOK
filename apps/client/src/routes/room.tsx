import { useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { useRoom } from '@/features/room/hooks/use-room';
import { Link } from 'react-router';
import { PrejoinView } from '@/features/room/components/prejoin-view';
import { useState } from 'react';
import { RoomView } from '@/features/room/components/room-view';

export const RoomPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [viewState, setViewState] = useState<'prejoin' | 'active'>('prejoin');

  const { data: room, isLoading, error } = useRoom(slug || '');

  const handleJoin = () => {
    // savedDeviceIds.current = {
    //   video: mediaManager.getVideoDeviceId(),
    //   audio: mediaManager.getAudioDeviceId(),
    //   isVideoEnabled: mediaManager.isPreferredVideoEnabled(),
    //   isAudioEnabled: mediaManager.isPreferredAudioEnabled(),
    // };
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

  if (viewState === 'prejoin') {
    return <PrejoinView room={room} roomUrl={roomUrl} onJoin={handleJoin} />;
  }

  return (
    <RoomView room={room} />
  );
};
