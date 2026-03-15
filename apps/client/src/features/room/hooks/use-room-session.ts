import { useCallback, useEffect } from 'react';
import { mediaManager } from '@/lib/media/manager';
import { useMediaControls } from '@/features/media/hooks/use-media-controls';
import { useMediaStream } from '@/features/media/hooks/use-media-stream';
import { useMediasoup, type RemotePeerMedia } from '@/hooks/use-mediasoup';
import { useQualityStats } from '@/hooks/use-quality-stats';
import { useActiveSpeaker } from '@/features/room/hooks/use-active-speaker';
import { useRemoteMediaElements } from '@/features/room/hooks/use-remote-media-elements';
import { useRoomParticipants } from '@/features/room/hooks/use-room-participants';
import type { Participant } from '@/components/room/ParticipantsList';
import type { Room } from '@/features/room/types/room.types';
import type { SfuState } from '@/lib/sfu/types';

export type RoomViewState = 'prejoin' | 'active';

export interface UseRoomSessionOptions {
  room: Room;
  userId: string | undefined;
  username: string | undefined;
}

export interface UseRoomSessionResult {
  localStream: MediaStream | null;
  mediaError: string | null;
  isMediaInitialized: boolean;
  mediaControls: ReturnType<typeof useMediaControls>;
  handleToggleVideo: () => Promise<void>;
  handleToggleAudio: () => Promise<void>;
  sfuState: SfuState;
  remotePeers: RemotePeerMedia[];
  wasKicked: boolean;
  kickPeer: (userId: string) => void;
  handleRemoteMediaElement: (peerId: string, element: HTMLVideoElement | null) => void;
  primaryRemoteMediaElement: HTMLVideoElement | null;
  participants: Participant[];
  activeSpeakerId: string | null;
  localUserId: string;
}

export function useRoomSession({ room, userId, username }: UseRoomSessionOptions): UseRoomSessionResult {
  const mediaControls = useMediaControls();
  const { setElement: handleRemoteMediaElement, primaryElement: primaryRemoteMediaElement } = useRemoteMediaElements();
  const { stream: localStream, error: mediaError, isInitialized: isMediaInitialized } = useMediaStream();

  const {
    state: sfuState,
    remotePeers,
    toggleVideoWithHardware,
    toggleAudioWithHardware,
    kickPeer,
    wasKicked,
  } = useMediasoup({
    roomId: room.id,
    roomOwnerId: room.ownerId,
    localStream,
  });

  const { peerStats } = useQualityStats({ enabled: sfuState.connectionState === 'connected' });

  const localUserId = userId ?? 'local';

  const activeSpeakerId = useActiveSpeaker({
    remotePeers,
    localUserId,
    localStream,
    enabled: sfuState.connectionState === 'connected',
  });

  const handleToggleVideo = useCallback(async () => {
    const nextVideoEnabled = !mediaControls.isVideoEnabled;
    mediaControls.setVideoEnabled(nextVideoEnabled);
    const success = await toggleVideoWithHardware(nextVideoEnabled);
    if (!success && nextVideoEnabled) {
      mediaControls.setVideoEnabled(false);
    }
  }, [mediaControls, toggleVideoWithHardware]);

  const handleToggleAudio = useCallback(async () => {
    const nextAudioEnabled = !mediaControls.isAudioEnabled;
    mediaControls.setAudioEnabled(nextAudioEnabled);
    const success = await toggleAudioWithHardware(nextAudioEnabled);
    if (!success && nextAudioEnabled) {
      mediaControls.setAudioEnabled(false);
    }
  }, [mediaControls, toggleAudioWithHardware]);

  const { participants } = useRoomParticipants({
    userId,
    username,
    isAudioEnabled: mediaControls.isAudioEnabled,
    isVideoEnabled: mediaControls.isVideoEnabled,
    connectionState: sfuState.connectionState,
    remotePeers,
    peerStats,
  });

  useEffect(() => {
    if (!wasKicked) return;
    mediaManager.stopStream();
  }, [wasKicked]);

  return {
    localStream,
    mediaError,
    isMediaInitialized,
    mediaControls,
    handleToggleVideo,
    handleToggleAudio,
    sfuState,
    remotePeers,
    wasKicked,
    kickPeer,
    handleRemoteMediaElement,
    primaryRemoteMediaElement,
    participants,
    activeSpeakerId,
    localUserId,
  };
}
