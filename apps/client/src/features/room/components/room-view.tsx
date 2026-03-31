import { useNavigate } from "react-router";
import { useEndRoom } from "../hooks/use-end-room";
import { useRoomSession } from "../hooks/use-room-session";
import { ActiveRoomView } from "./active-room-view"
import { RoomAlerts } from "./room-alerts"
import { ActiveRoomHeader } from "./active-room-header"
import type { Room } from "../types/room.types";
import { useAuth } from "@/features/auth/contexts/auth.context";
import { RoomAudioContextProvider } from "../contexts/room-audio.context";
import { PeerQualityProvider } from "../contexts/peer-quality.context";

interface Props {
  room: Room;
  displayName: string;
}

export const RoomView = ({ room, displayName }: Props) => {
  const navigate = useNavigate();
  const endRoom = useEndRoom({
    onSuccess: () => navigate('/'),
  });
  const { user } = useAuth();
  const isOwner = user?.id === room.ownerId;
  const session = useRoomSession({ room, userId: user?.id, displayName });

  return (
    <PeerQualityProvider enabled={session.sfuState.connectionState === 'connected'}>
      <RoomAudioContextProvider session={session}>
        <div className="h-screen flex flex-col">
          <ActiveRoomHeader
            isVideoEnabled={session.mediaControls.isVideoEnabled}
            isAudioEnabled={session.mediaControls.isAudioEnabled}
            isOwner={isOwner}
            onEndRoom={() => endRoom.mutate(room.id)}
            isEndingRoom={endRoom.isPending}
          />

          <RoomAlerts
            endRoomError={!!endRoom.error}
            wasKicked={session.wasKicked}
          />

          <ActiveRoomView
            session={session}
            room={room}
            currentUserId={user?.id}
            currentUsername={displayName}
          />
        </div>
      </RoomAudioContextProvider>
    </PeerQualityProvider>
  )
}
