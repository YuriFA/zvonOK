import { useMemo } from 'react';
import type { Participant } from '@/components/room/participants-list';
import type { RemotePeerMedia } from '@/hooks/use-mediasoup';

export interface UseRoomParticipantsOptions {
  userId: string | undefined;
  username: string | undefined;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  connectionState: string;
  remotePeers: RemotePeerMedia[];
}

export interface UseRoomParticipantsReturn {
  participants: Participant[];
}

export function useRoomParticipants({
  userId,
  username,
  isAudioEnabled,
  isVideoEnabled,
  connectionState,
  remotePeers,
}: UseRoomParticipantsOptions): UseRoomParticipantsReturn {

  const participants: Participant[] = useMemo(() => {
    const localParticipant: Participant = {
      id: userId ?? 'local',
      userId: userId,
      username: username ?? 'You',
      isMuted: !isAudioEnabled,
      isVideoOff: !isVideoEnabled,
      isConnected: connectionState === 'connected',
    };

    const remoteParticipants: Participant[] = remotePeers.map((peer: RemotePeerMedia) => {
      return {
        id: peer.userId,
        userId: peer.userId,
        username: peer.username,
        isMuted: !peer.isAudioEnabled,
        isVideoOff: !peer.isVideoEnabled,
        isConnected: true,
      };
    });

    return [localParticipant, ...remoteParticipants];
  }, [userId, username, isAudioEnabled, isVideoEnabled, connectionState, remotePeers]);

  return { participants };
}
