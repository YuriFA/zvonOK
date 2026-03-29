import { useCallback, useMemo } from 'react';
import { useQualityStats } from '@/hooks/use-quality-stats';
import { useActiveSpeaker } from '@/features/room/hooks/use-active-speaker';
import { useRoomParticipants } from '@/features/room/hooks/use-room-participants';
import { useRoomSfu } from '@/features/room/hooks/use-room-sfu';
import { useRemoteAudio } from '@/hooks/use-remote-audio';
import { RemoteAudioMixer } from '@/lib/audio/remote-audio-mixer';
import type { IRemoteAudioMixer } from '@/lib/audio/remote-audio-mixer';
import type { RemotePeerMedia } from '@/hooks/use-mediasoup';
import type { Participant } from '@/components/room/ParticipantsList';
import type { Room } from '@/features/room/types/room.types';
import type { SfuState } from '@/lib/sfu/types';
import type { UseMediaControlsReturn } from '@/features/media/hooks/use-media-controls';
import { useMediaStreamContext } from '@/features/media/contexts/media-stream.context';

export interface UseRoomSessionOptions {
  room: Room;
  userId: string | undefined;
  displayName: string;
}

export interface UseRoomSessionResult {
  localVideoStream: MediaStream | null;
  localAudioStream: MediaStream | null;
  mediaControls: UseMediaControlsReturn;
  toggleVideo: () => Promise<void>;
  toggleAudio: () => Promise<void>;
  sfuState: SfuState;
  remotePeers: RemotePeerMedia[];
  wasKicked: boolean;
  kickPeer: (userId: string) => void;
  participants: Participant[];
  activeSpeakerId: string | null;
  localUserId: string;
  mixer: IRemoteAudioMixer | null;
  audioElement: HTMLAudioElement | null;
}

const createMixer = () => new RemoteAudioMixer();

export function useRoomSession({ room, userId, displayName }: UseRoomSessionOptions): UseRoomSessionResult {
  const { videoStream: localVideoStream, audioStream: localAudioStream, stop: stopMedia } = useMediaStreamContext();

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
    localVideoStream,
    localAudioStream,
    onKicked: handleKicked,
    displayName,
  });

  const isConnected = sfuState.connectionState === 'connected';

  const { mixer } = useRemoteAudio(createMixer, {
    remotePeers,
    enabled: isConnected,
  });

  const getRemoteAnalyser = useMemo(
    () => (mixer ? (userId: string) => mixer.getAnalyser(userId) : undefined),
    [mixer],
  );

  const activeSpeakerId = useActiveSpeaker({
    remotePeers,
    localUserId,
    localAudioStream,
    enabled: isConnected,
    getRemoteAnalyser,
  });

  const { peerStats } = useQualityStats({ enabled: isConnected });

  const { participants } = useRoomParticipants({
    userId,
    username: displayName,
    isAudioEnabled: mediaControls.isAudioEnabled,
    isVideoEnabled: mediaControls.isVideoEnabled,
    connectionState: sfuState.connectionState,
    remotePeers,
    peerStats,
  });

  const audioElement = mixer?.getAudioElement() ?? null;

  return {
    localVideoStream,
    localAudioStream,
    mediaControls,
    toggleVideo,
    toggleAudio,
    sfuState,
    remotePeers,
    wasKicked,
    kickPeer,
    participants,
    activeSpeakerId,
    localUserId,
    mixer,
    audioElement,
  };
}
