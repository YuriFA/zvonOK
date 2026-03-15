import { useMemo } from 'react';
import type { Participant } from '@/components/room/ParticipantsList';
import type { RemotePeerMedia } from '@/hooks/use-mediasoup';
import type { PeerQualityStats } from '@/lib/sfu/types';

export interface UseRoomParticipantsOptions {
  userId: string | undefined;
  username: string | undefined;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  connectionState: string;
  remotePeers: RemotePeerMedia[];
  peerStats: Map<string, PeerQualityStats>;
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
  peerStats,
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
      const stats = peerStats.get(peer.userId);
      return {
        id: peer.userId,
        userId: peer.userId,
        username: peer.username,
        isMuted: !peer.isAudioEnabled,
        isVideoOff: !peer.isVideoEnabled,
        isConnected: true,
        qualityScore: stats?.score,
        qualityStats: stats?.stats,
      };
    });

    return [localParticipant, ...remoteParticipants];
  }, [userId, username, isAudioEnabled, isVideoEnabled, connectionState, remotePeers, peerStats]);

  return { participants };
}
