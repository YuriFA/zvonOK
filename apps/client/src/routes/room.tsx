import { useParams, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { useRoom } from '@/features/room/hooks/use-room';
import { useEndRoom } from '@/features/room/hooks/use-end-room';
import { useAuth } from '@/features/auth/contexts/auth.context';
import { Link } from 'react-router';
import { useRoomSession } from '@/features/room/hooks/use-room-session';
import { RoomHeader } from '@/features/room/components/RoomHeader';
import { RoomAlerts } from '@/features/room/components/RoomAlerts';
import { PrejoinView } from '@/features/room/components/PrejoinView';
import { ActiveRoomView } from '@/features/room/components/ActiveRoomView';

export const RoomPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: room, isLoading, error } = useRoom(slug || '');

  const endRoom = useEndRoom({
    onSuccess: () => navigate('/'),
  });

  const session = useRoomSession({
    room,
    userId: user?.id,
    username: user?.username,
  });

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

  if (session.viewState === 'prejoin') {
    return <PrejoinView room={room} roomUrl={roomUrl} onJoin={session.handleJoin} />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <RoomHeader
        variant="active"
        room={room}
        primaryRemoteMediaElement={session.primaryRemoteMediaElement}
        isVideoEnabled={session.mediaControls.isVideoEnabled}
        isAudioEnabled={session.mediaControls.isAudioEnabled}
        isOwner={isOwner}
        onEndRoom={() => endRoom.mutate(room.id)}
        isEndingRoom={endRoom.isPending}
      />

      <RoomAlerts
        endRoomError={!!endRoom.error}
        mediaError={session.mediaError}
        wasKicked={session.wasKicked}
      />

      <ActiveRoomView
        session={session}
        room={room}
        currentUserId={user?.id}
        currentUsername={user?.username}
      />
    </div>
  );
};
