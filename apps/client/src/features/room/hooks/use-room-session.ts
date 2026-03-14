import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { mediaManager } from '@/lib/media/manager';
import { useMediaControls } from '@/features/media/hooks/use-media-controls';
import { useMediasoup, type RemotePeerMedia } from '@/hooks/use-mediasoup';
import { useQualityStats } from '@/hooks/use-quality-stats';
import { useActiveSpeaker } from '@/features/room/hooks/use-active-speaker';
import type { Participant } from '@/components/room/ParticipantsList';
import type { Room } from '@/features/room/types/room.types';
import type { SfuState } from '@/lib/sfu/types';

export type RoomViewState = 'prejoin' | 'active';

interface SavedMediaSetup {
  video: string | null;
  audio: string | null;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

export interface UseRoomSessionOptions {
  room: Room | undefined;
  userId: string | undefined;
  username: string | undefined;
}

export interface UseRoomSessionResult {
  // View state
  viewState: RoomViewState;
  handleJoin: () => void;

  // Media
  localStream: MediaStream | null;
  mediaError: string | null;
  isMediaInitialized: boolean;
  mediaControls: ReturnType<typeof useMediaControls>;
  handleToggleVideo: () => Promise<void>;
  handleToggleAudio: () => Promise<void>;

  // SFU
  sfuState: SfuState;
  remotePeers: RemotePeerMedia[];
  wasKicked: boolean;
  kickPeer: (userId: string) => void;

  // Remote video elements (for speaker sink)
  handleRemoteMediaElement: (peerId: string, element: HTMLVideoElement | null) => void;
  primaryRemoteMediaElement: HTMLVideoElement | null;

  // Participants
  participants: Participant[];

  // Active speaker
  activeSpeakerId: string | null;
  localUserId: string;
}

export function useRoomSession({ room, userId, username }: UseRoomSessionOptions): UseRoomSessionResult {
  const [viewState, setViewState] = useState<RoomViewState>('prejoin');
  const savedDeviceIds = useRef<SavedMediaSetup | null>(null);

  const handleJoin = useCallback(() => {
    savedDeviceIds.current = {
      video: mediaManager.getVideoDeviceId(),
      audio: mediaManager.getAudioDeviceId(),
      isVideoEnabled: mediaManager.isPreferredVideoEnabled(),
      isAudioEnabled: mediaManager.isPreferredAudioEnabled(),
    };
    setViewState('active');
  }, []);

  // Media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isMediaInitialized, setIsMediaInitialized] = useState(false);
  const mediaControls = useMediaControls();
  const [remoteMediaElements, setRemoteMediaElements] = useState<Map<string, HTMLVideoElement>>(new Map());

  const handleRemoteMediaElement = useCallback((peerId: string, element: HTMLVideoElement | null) => {
    setRemoteMediaElements((prev) => {
      const next = new Map(prev);
      if (element) {
        next.set(peerId, element);
      } else {
        next.delete(peerId);
      }
      return next;
    });
  }, []);

  const primaryRemoteMediaElement = remoteMediaElements.values().next().value ?? null;

  const {
    state: sfuState,
    remotePeers,
    toggleVideoWithHardware,
    toggleAudioWithHardware,
    kickPeer,
    wasKicked,
  } = useMediasoup({
    roomId: room?.id,
    roomOwnerId: room?.ownerId,
    localStream,
    enabled: !!room && isMediaInitialized && viewState === 'active',
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

  // Build participants list
  const participants: Participant[] = useMemo(() => {
    const localParticipant: Participant = {
      id: userId ?? 'local',
      userId: userId,
      username: username ?? 'You',
      isMuted: !mediaControls.isAudioEnabled,
      isVideoOff: !mediaControls.isVideoEnabled,
      isConnected: sfuState.connectionState === 'connected',
    };

    const remoteParticipants: Participant[] = remotePeers.map((peer: RemotePeerMedia) => {
      const qualityData = peerStats.get(peer.userId);
      return {
        id: peer.userId,
        userId: peer.userId,
        username: peer.username,
        isMuted: !peer.isAudioEnabled,
        isVideoOff: !peer.isVideoEnabled,
        isConnected: true,
        qualityScore: qualityData?.score,
        qualityStats: qualityData?.stats,
      };
    });

    return [localParticipant, ...remoteParticipants];
  }, [
    userId,
    username,
    mediaControls.isAudioEnabled,
    mediaControls.isVideoEnabled,
    sfuState.connectionState,
    remotePeers,
    peerStats,
  ]);

  // Stop stream when kicked
  useEffect(() => {
    if (!wasKicked) return;
    mediaManager.stopStream();
    setLocalStream(null);
  }, [wasKicked]);

  // Media stream — start after join, stop on unmount or leaving active state
  useEffect(() => {
    if (viewState !== 'active') return;

    let isCancelled = false;

    const startMedia = async () => {
      setIsMediaInitialized(false);
      setMediaError(null);

      const ids = savedDeviceIds.current;
      if (ids?.video) {
        mediaManager.setSelectedVideoDeviceId(ids.video);
      }
      if (ids?.audio) {
        mediaManager.setSelectedAudioDeviceId(ids.audio);
      }

      const constraints = ids
        ? {
            video: ids.isVideoEnabled
              ? ids.video
                ? { deviceId: { exact: ids.video }, width: { ideal: 1280 }, height: { ideal: 720 } }
                : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' as const }
              : false,
            audio: ids.isAudioEnabled
              ? ids.audio
                ? {
                    deviceId: { exact: ids.audio },
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                  }
                : { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
              : false,
          }
        : undefined;

      try {
        const stream = await mediaManager.startStream(constraints);
        if (isCancelled) {
          mediaManager.stopStream();
          return;
        }
        setLocalStream(stream);
      } catch (err) {
        if (isCancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to access camera/microphone';
        setMediaError(message);
        console.error('Failed to start media stream:', err);
      } finally {
        if (!isCancelled) {
          setIsMediaInitialized(true);
        }
      }
    };

    void startMedia();

    return () => {
      isCancelled = true;
      mediaManager.stopStream();
      setLocalStream(null);
      setMediaError(null);
      setIsMediaInitialized(false);
    };
  }, [viewState]);

  return {
    viewState,
    handleJoin,
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
