import { useCallback } from 'react';
import { useQualityStats } from '@/hooks/use-quality-stats';
import { useActiveSpeaker } from '@/features/room/hooks/use-active-speaker';
import { useRemoteMediaElements } from '@/features/room/hooks/use-remote-media-elements';
import { useRoomParticipants } from '@/features/room/hooks/use-room-participants';
import { useRoomSfu } from '@/features/room/hooks/use-room-sfu';
import type { RemotePeerMedia } from '@/hooks/use-mediasoup';
import type { Participant } from '@/components/room/ParticipantsList';
import type { Room } from '@/features/room/types/room.types';
import type { SfuState } from '@/lib/sfu/types';
import type { UseMediaControlsReturn } from '@/features/media/hooks/use-media-controls';
import { useMediaStreamContext } from '@/features/media/contexts/media-stream.context';

export interface UseRoomSessionOptions {
  room: Room;
  userId: string | undefined;
  username: string | undefined;
}

export interface UseRoomSessionResult {
  localStream: MediaStream | null;
  mediaError: string | null;
  mediaControls: UseMediaControlsReturn;
  toggleVideo: () => Promise<void>;
  toggleAudio: () => Promise<void>;
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
  const { setElement: handleRemoteMediaElement, primaryElement: primaryRemoteMediaElement } = useRemoteMediaElements();

  const { stream: localStream, error: mediaError, stop: stopMedia } = useMediaStreamContext();

  const localUserId = userId ?? 'local';

  const handleKicked = useCallback(() => {
    stopMedia();
  }, [stopMedia]);

  const {
    sfuState,
    remotePeers,
    wasKicked,
    kickPeer,
    mediaControls,
    toggleVideo,
    toggleAudio,
  } = useRoomSfu({
    roomId: room.id,
    roomOwnerId: room.ownerId,
    localStream,
    onKicked: handleKicked,
  });

  const { peerStats } = useQualityStats({ enabled: sfuState.connectionState === 'connected' });

  const activeSpeakerId = useActiveSpeaker({
    remotePeers,
    localUserId,
    localStream,
    enabled: sfuState.connectionState === 'connected',
  });

  const { participants } = useRoomParticipants({
    userId,
    username,
    isAudioEnabled: mediaControls.isAudioEnabled,
    isVideoEnabled: mediaControls.isVideoEnabled,
    connectionState: sfuState.connectionState,
    remotePeers,
    peerStats,
  });

  return {
    localStream,
    mediaError,
    mediaControls,
    toggleVideo,
    toggleAudio,
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
