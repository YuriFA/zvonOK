import { useCallback, useEffect, useRef, useState } from 'react';
import { useQualityStats } from '@/hooks/use-quality-stats';
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
import { AudioLevelSampler } from '@/lib/audio/audio-level-sampler';
import { ActiveSpeakerDetector } from '@/lib/audio/active-speaker-detector';

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
  audioLevels: Map<string, number>;
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

  const samplerRef = useRef<AudioLevelSampler>(new AudioLevelSampler());
  const detectorRef = useRef<ActiveSpeakerDetector>(new ActiveSpeakerDetector());
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<Map<string, number>>(new Map());
  const tickCountRef = useRef(0);

  useEffect(() => {
    const sampler = samplerRef.current;

    if (!isConnected) {
      sampler.clear();
      detectorRef.current.reset();
      setActiveSpeakerId(null);
      setAudioLevels(new Map());
      return;
    }

    if (localAudioStream && localUserId) {
      sampler.addOwned(localUserId, localAudioStream);
    } else {
      sampler.remove(localUserId);
    }

    const currentPeerIds = new Set<string>();
    for (const peer of remotePeers) {
      currentPeerIds.add(peer.userId);
      if (mixer) {
        const analyser = mixer.getAnalyser(peer.userId);
        if (analyser) {
          sampler.addBorrowed(peer.userId, analyser);
        }
      }
    }

    for (const id of sampler.ids()) {
      if (id !== localUserId && !currentPeerIds.has(id)) {
        sampler.remove(id);
      }
    }
  }, [isConnected, localAudioStream, localUserId, remotePeers, mixer]);

  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      const levels = samplerRef.current.sample();
      setAudioLevels(levels);

      tickCountRef.current++;
      if (tickCountRef.current % 2 === 0) {
        const speakerId = detectorRef.current.detect(levels);
        setActiveSpeakerId(speakerId);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      tickCountRef.current = 0;
    };
  }, [isConnected]);

  useEffect(() => {
    const sampler = samplerRef.current;
    const detector = detectorRef.current;
    return () => {
      sampler.dispose();
      detector.reset();
    };
  }, []);

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
    audioLevels,
    localUserId,
    mixer,
    audioElement,
  };
}
