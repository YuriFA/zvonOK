import { useCallback } from 'react';
import { VideoGrid } from '@/components/video-grid';
import { ParticipantsList } from '@/components/room/ParticipantsList';
import { LocalVideoTile } from '@/features/room/components/local-video-tile';
import { RemoteVideoTile } from '@/features/room/components/remote-video-tile';
import { ConnectionStatus } from '@/features/room/components/connection-status';
import type { UseRoomSessionResult } from '@/features/room/hooks/use-room-session';
import type { Room } from '@/features/room/types/room.types';
import { MediaControls } from '@/features/media/components/media-controls';

interface ActiveRoomViewProps {
  session: UseRoomSessionResult;
  room: Room;
  currentUserId: string | undefined;
  currentUsername: string | undefined;
}

export function ActiveRoomView({
  session,
  room,
  currentUserId,
  currentUsername,
}: ActiveRoomViewProps) {
  const {
    localVideoStream,
    mediaControls,
    toggleVideo,
    toggleAudio,
    sfuState,
    remotePeers,
    activeSpeakerId,
    localUserId,
    handleRemoteMediaElement,
    participants,
    kickPeer,
  } = session;

  const handleToggleVideo = useCallback(async () => {
    await toggleVideo();
  }, [toggleVideo]);

  const handleToggleAudio = useCallback(async () => {
    await toggleAudio();
  }, [toggleAudio]);

  return (
    <main className="flex flex-1 flex-col p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="relative min-w-0">
          <VideoGrid className="mb-4">
            <LocalVideoTile
              stream={localVideoStream}
              username={currentUsername}
              isVideoEnabled={mediaControls.isVideoEnabled}
              isActiveSpeaker={activeSpeakerId === localUserId}
            />

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

          <ConnectionStatus connectionState={sfuState.connectionState} />

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
            <MediaControls
              isVideoEnabled={mediaControls.isVideoEnabled}
              isAudioEnabled={mediaControls.isAudioEnabled}
              videoCaptureState={mediaControls.videoCaptureState}
              audioCaptureState={mediaControls.audioCaptureState}
              onToggleVideo={handleToggleVideo}
              onToggleAudio={handleToggleAudio}
            />
          </div>
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
