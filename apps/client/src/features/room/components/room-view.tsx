import { useNavigate } from "react-router";
import { useEndRoom } from "../hooks/use-end-room";
import { useRoomSession } from "../hooks/use-room-session";
import { ActiveRoomView } from "./active-room-view"
import { RoomAlerts } from "./room-alerts"
import { RoomHeader } from "./room-header"
import type { Room } from "../types/room.types";
import { useAuth } from "@/features/auth/contexts/auth.context";

interface Props {
  room: Room;
}

export const RoomView = ({ room }: Props) => {
  const navigate = useNavigate();
  const endRoom = useEndRoom({
    onSuccess: () => navigate('/'),
  });
  const { user } = useAuth();
  const isOwner = user?.id === room.ownerId;
  const session = useRoomSession({ room, userId: user?.id, username: user?.username });

  return (
    <div className="min-h-screen flex flex-col">
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
  )
}
