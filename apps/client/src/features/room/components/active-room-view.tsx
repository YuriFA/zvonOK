import { useCallback } from 'react';
import { VideoGrid } from '@/components/video-grid';
import { ParticipantsList } from '@/components/room/ParticipantsList';
import { LocalVideoTile } from '@/features/room/components/local-video-tile';
import { RemoteVideoTile } from '@/features/room/components/remote-video-tile';
import { ConnectionStatus } from '@/features/room/components/connection-status';
import type { PermissionStateResult } from '@/features/media/hooks/use-permission-state';
import type { UseRoomSessionResult } from '@/features/room/hooks/use-room-session';
import type { Room } from '@/features/room/types/room.types';

interface ActiveRoomViewProps {
  session: UseRoomSessionResult;
  room: Room;
  currentUserId: string | undefined;
  currentUsername: string | undefined;
  permissionState: PermissionStateResult;
  permissionModalOpen: boolean;
  onPermissionModalOpenChange: (open: boolean) => void;
}

export function ActiveRoomView({
  session,
  room,
  currentUserId,
  currentUsername,
  permissionState,
  onPermissionModalOpenChange,
}: ActiveRoomViewProps) {
  const {
    localStream,
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
    if (permissionState.isCameraDenied) {
      onPermissionModalOpenChange(true);
      return;
    }
    await toggleVideo();
  }, [permissionState.isCameraDenied, toggleVideo, onPermissionModalOpenChange]);

  const handleToggleAudio = useCallback(async () => {
    if (permissionState.isMicrophoneDenied) {
      onPermissionModalOpenChange(true);
      return;
    }
    await toggleAudio();
  }, [permissionState.isMicrophoneDenied, toggleAudio, onPermissionModalOpenChange]);

  return (
    <main className="flex flex-1 flex-col p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <VideoGrid className="mb-4">
            <LocalVideoTile
              stream={localStream}
              username={currentUsername}
              isVideoEnabled={mediaControls.isVideoEnabled}
              isAudioEnabled={mediaControls.isAudioEnabled}
              videoCaptureState={mediaControls.videoCaptureState}
              audioCaptureState={mediaControls.audioCaptureState}
              isActiveSpeaker={activeSpeakerId === localUserId}
              onToggleVideo={handleToggleVideo}
              onToggleAudio={handleToggleAudio}
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
