import { VideoGrid } from '@/components/video-grid';
import { ParticipantsList } from '@/components/room/ParticipantsList';
import { LocalVideoTile } from '@/features/room/components/local-video-tile';
import { RemoteVideoTile } from '@/features/room/components/remote-video-tile';
import { ConnectionStatus } from '@/features/room/components/connection-status';
import type { UseRoomSessionResult } from '@/features/room/hooks/use-room-session';
import type { Room } from '@/features/room/types/room.types';
import { RoomInfoBar } from './room-info-bar';

interface ActiveRoomViewProps {
  session: UseRoomSessionResult;
  room: Room;
  currentUserId: string | undefined;
  currentUsername: string | undefined;
}

export function ActiveRoomView({ session, room, currentUserId, currentUsername }: ActiveRoomViewProps) {
  const {
    localStream,
    mediaError,
    isMediaInitialized,
    mediaControls,
    handleToggleVideo,
    handleToggleAudio,
    sfuState,
    remotePeers,
    activeSpeakerId,
    localUserId,
    handleRemoteMediaElement,
    participants,
    kickPeer,
  } = session;

  return (
    <main className="flex flex-1 flex-col p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <VideoGrid className="mb-4">
            {isMediaInitialized && (
              <LocalVideoTile
                stream={localStream}
                username={currentUsername}
                isVideoEnabled={mediaControls.isVideoEnabled}
                isAudioEnabled={mediaControls.isAudioEnabled}
                isActiveSpeaker={activeSpeakerId === localUserId}
                mediaError={mediaError}
                onToggleVideo={handleToggleVideo}
                onToggleAudio={handleToggleAudio}
              />
            )}

            {remotePeers.map((peer) => (
              <RemoteVideoTile
                key={peer.userId}
                peer={peer}
                isActiveSpeaker={activeSpeakerId === peer.userId}
                connectionState={sfuState.connectionState}
                onMediaElement={handleRemoteMediaElement}
              />
            ))}
          </VideoGrid>

          <RoomInfoBar room={room} className="mb-4" />

          <ConnectionStatus connectionState={sfuState.connectionState} />
        </div>

        <aside className="min-w-0">
          <ParticipantsList
            participants={participants}
            currentUserId={currentUserId}
            roomOwnerId={room.ownerId}
            onKickParticipant={kickPeer}
            className="lg:sticky lg:top-4"
          />
        </aside>
      </div>
    </main>
  );
}
