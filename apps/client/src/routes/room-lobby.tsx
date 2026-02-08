import { useParams, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { useRoom } from '@/features/room/hooks';
import { DeviceSelector } from '@/features/media/components/device-selector';
import { CopyLink } from '@/components/ui/copy-link';
import { ArrowLeft, Users, Calendar } from 'lucide-react';
import { Link } from 'react-router';

export const RoomLobbyPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: room, isLoading, error } = useRoom(slug || '');

  const handleJoinRoom = () => {
    if (!slug) return;
    navigate(`/room/${slug}`);
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
        <Button asChild>
          <Link to="/">Back to Lobby</Link>
        </Button>
      </div>
    );
  }

  const roomUrl = `${window.location.origin}/room/${room.slug}`;

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
              <h1 className="text-lg font-semibold">
                {room.name || 'Unnamed Room'}
              </h1>
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
            <span>
              Created {new Date(room.createdAt).toLocaleDateString()}
            </span>
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
              Copy this link and share it with others to invite them to the
              room.
            </p>
            <CopyLink url={roomUrl} />
          </div>

          {/* Join button */}
          <div className="flex justify-end">
            <Button size="lg" onClick={handleJoinRoom}>
              Join Room
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};
