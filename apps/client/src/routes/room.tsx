import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { useRoom, useEndRoom } from '@/features/room/hooks';
import { useAuth } from '@/features/auth/contexts/auth.context';
import { ArrowLeft, Users, Calendar, Wifi, WifiOff } from 'lucide-react';
import { Link } from 'react-router';
import { wsManager, type ConnectionStatus, type PeerInfo } from '@/lib/websocket';

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

  const handleEndRoom = () => {
    if (!room || !user || room.ownerId !== user.id) return;
    endRoom.mutate(room.id);
  };

  // WebSocket connection
  useEffect(() => {
    if (!room) return;

    // Connect to WebSocket
    wsManager.connect();

    // Subscribe to status changes
    const unsubscribeStatus = wsManager.onStatusChange(setWsStatus);

    // Handle room joined
    const handleRoomJoined = (data: { peerId: string; peers: PeerInfo[] }) => {
      console.log('[WS] Room joined:', data);
      setMyPeerId(data.peerId);
      setPeers(data.peers);
    };

    // Handle peer joined
    const handlePeerJoined = (data: { peerId: string; userInfo: { username: string } }) => {
      console.log('[WS] Peer joined:', data);
      setPeers((prev) => [...prev, { id: data.peerId, userInfo: data.userInfo }]);
    };

    // Handle peer left
    const handlePeerLeft = (data: { peerId: string }) => {
      console.log('[WS] Peer left:', data);
      setPeers((prev) => prev.filter((p) => p.id !== data.peerId));
    };

    // Handle errors
    const handleError = (data: { message: string }) => {
      console.error('[WS] Error:', data);
    };

    // Subscribe to events
    wsManager.on('room:joined', handleRoomJoined);
    wsManager.on('peer:joined', handlePeerJoined);
    wsManager.on('peer:left', handlePeerLeft);
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
      wsManager.off('error', handleError);
      wsManager.leaveRoom();
    };
  }, [room]);

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

      {/* Main content */}
      <main className="flex flex-1 flex-col p-4">
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
