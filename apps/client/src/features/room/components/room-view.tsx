import { useState } from "react";
import { useNavigate } from "react-router";
import { useEndRoom } from "../hooks/use-end-room";
import { useRoomSession } from "../hooks/use-room-session";
import { usePermissionState } from "@/features/media/hooks/use-permission-state";
import { ActiveRoomView } from "./active-room-view"
import { RoomAlerts } from "./room-alerts"
import { RoomHeader } from "./room-header"
import type { Room } from "../types/room.types";
import { useAuth } from "@/features/auth/contexts/auth.context";

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
  const permissionState = usePermissionState();
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);

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
        wasKicked={session.wasKicked}
      />

      <ActiveRoomView
        session={session}
        room={room}
        currentUserId={user?.id}
        currentUsername={displayName}
        permissionState={permissionState}
        permissionModalOpen={permissionModalOpen}
        onPermissionModalOpenChange={setPermissionModalOpen}
      />
    </div>
  )
}
