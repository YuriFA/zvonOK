import { useCallback, useState } from 'react';
import { VideoGrid } from '@/components/video-grid';
import { ParticipantsList } from '@/components/room/ParticipantsList';
import { LocalVideoTile } from '@/features/room/components/local-video-tile';
import { RemoteVideoTile } from '@/features/room/components/remote-video-tile';
import { RemoteAudio } from '@/components/remote-audio';
import type { UseRoomSessionResult } from '@/features/room/hooks/use-room-session';
import type { Room } from '@/features/room/types/room.types';
import { MediaControls } from '@/features/media/components/media-controls';
import { cn } from '@/lib/utils';

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
    participants,
    kickPeer,
    mixer,
  } = session;

  const handleToggleVideo = useCallback(async () => {
    await toggleVideo();
  }, [toggleVideo]);

  const handleToggleAudio = useCallback(async () => {
    await toggleAudio();
  }, [toggleAudio]);

  const [isParticipantsVisible, setIsParticipantsVisible] = useState(false);

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 p-4">
        <VideoGrid className="flex-1">
          <LocalVideoTile
            stream={localVideoStream}
            username={currentUsername}
            isVideoEnabled={mediaControls.isVideoEnabled}
            isActiveSpeaker={activeSpeakerId === localUserId}
          />

          {remotePeers.length > 0 && remotePeers.map((peer) => (
            <RemoteVideoTile
              key={peer.userId}
              peer={peer}
              isActiveSpeaker={activeSpeakerId === peer.userId}
              connectionState={sfuState.connectionState}
            />
          ))}
        </VideoGrid>

        <RemoteAudio mixer={mixer} />

        <aside
          className={cn(
            'flex-1 transition-all duration-300 ease-in-out overflow-hidden',
            isParticipantsVisible ? 'max-w-80 ml-4' : 'max-w-0 ml-0',
          )}
        >
          <ParticipantsList
            className="size-full"
            participants={participants}
            currentUserId={currentUserId}
            roomOwnerId={room.ownerId}
            onKickParticipant={kickPeer}
          />
        </aside>
      </div>

      <div className="flex items-center justify-center border-t py-4">
        <MediaControls
          isVideoEnabled={mediaControls.isVideoEnabled}
          isAudioEnabled={mediaControls.isAudioEnabled}
          videoCaptureState={mediaControls.videoCaptureState}
          audioCaptureState={mediaControls.audioCaptureState}
          onToggleVideo={handleToggleVideo}
          onToggleAudio={handleToggleAudio}
          isParticipantsVisible={isParticipantsVisible}
          onToggleParticipants={() => setIsParticipantsVisible((v) => !v)}
        />
      </div>
    </main>
  );
}
