import { useCallback } from 'react';
import { VideoGrid } from '@/components/video-grid';
import { ParticipantsList } from '@/components/room/ParticipantsList';
import { LocalVideoTile } from '@/features/room/components/local-video-tile';
import { RemoteVideoTile } from '@/features/room/components/remote-video-tile';
import { ConnectionStatus } from '@/features/room/components/connection-status';
import { useMediaErrors } from '@/features/media/hooks/use-media-errors';
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
    mediaError,
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

  const { videoError: rawVideoError, audioError: rawAudioError } = useMediaErrors({
    streamError: mediaError,
    isVideoAvailable: mediaControls.isVideoAvailable,
    isAudioAvailable: mediaControls.isAudioAvailable,
    isVideoEnabled: mediaControls.isVideoEnabled,
    isAudioEnabled: mediaControls.isAudioEnabled,
  });

  // Override error type when browser-level permission is denied.
  // useMediaErrors returns null when the user has deliberately turned off
  // the device (isVideoEnabled=false), but we still want to show the
  // permission-denied warning on the toggle button so the user knows
  // clicking it will require granting permission first.
  const videoError = permissionState.isCameraDenied ? 'permission-denied' as const : rawVideoError;
  const audioError = permissionState.isMicrophoneDenied ? 'permission-denied' as const : rawAudioError;

  const handleToggleVideo = useCallback(async () => {
    // When camera permission is denied at browser level, opening the modal
    // is the only meaningful action — getUserMedia would fail silently.
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
              isActiveSpeaker={activeSpeakerId === localUserId}
              videoError={videoError}
              audioError={audioError}
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
