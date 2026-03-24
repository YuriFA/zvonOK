import { useCallback, useEffect } from 'react';
import { useMediasoup, type RemotePeerMedia } from '@/hooks/use-mediasoup';
import { useMediaControls, type UseMediaControlsReturn } from '@/features/media/hooks/use-media-controls';
import { useMediaTrackController } from '@/features/media/contexts/media-manager.context';
import type { SfuState } from '@/lib/sfu/types';

export interface UseRoomSfuOptions {
  roomId: string;
  roomOwnerId: string;
  localStream: MediaStream | null;
  onKicked: () => void;
  displayName: string;
}

export interface UseRoomSfuResult {
  sfuState: SfuState;
  remotePeers: RemotePeerMedia[];
  wasKicked: boolean;
  kickPeer: (userId: string) => void;
  mediaControls: UseMediaControlsReturn;
  toggleVideo: () => Promise<void>;
  toggleAudio: () => Promise<void>;
}

export function useRoomSfu({
  roomId,
  roomOwnerId,
  localStream,
  onKicked,
  displayName,
}: UseRoomSfuOptions): UseRoomSfuResult {
  const trackController = useMediaTrackController();
  const mediaControls = useMediaControls();

  const {
    state: sfuState,
    remotePeers,
    kickPeer,
    wasKicked,
    produceTrack,
    pauseProducer,
    resumeProducer,
    replaceTrack,
    hasProducer,
  } = useMediasoup({
    roomId,
    roomOwnerId,
    localStream,
    displayName,
  });

  useEffect(() => {
    if (wasKicked) {
      onKicked();
    }
  }, [wasKicked, onKicked]);

  const toggleVideo = useCallback(async () => {
    const nextEnabled = !mediaControls.isVideoEnabled;
    mediaControls.setVideoEnabled(nextEnabled);

    if (nextEnabled) {
      const newTrack = await trackController.startVideoTrack();
      if (!newTrack) {
        mediaControls.setVideoEnabled(false);
        return;
      }

      if (!hasProducer('video')) {
        const produced = await produceTrack(newTrack);
        if (!produced) {
          trackController.stopVideoTrack('Failed to publish camera');
          mediaControls.setVideoEnabled(false);
          return;
        }
        resumeProducer('video');
        return;
      }

      const replaced = await replaceTrack('video', newTrack);
      if (!replaced) {
        trackController.stopVideoTrack('Failed to publish camera');
        mediaControls.setVideoEnabled(false);
        return;
      }

      resumeProducer('video');
    } else {
      if (hasProducer('video')) {
        pauseProducer('video');
      }

      await replaceTrack('video', null);
      trackController.stopVideoTrack();
    }
  }, [trackController, produceTrack, mediaControls, hasProducer, pauseProducer, resumeProducer, replaceTrack]);

  const toggleAudio = useCallback(async () => {
    const nextEnabled = !mediaControls.isAudioEnabled;
    mediaControls.setAudioEnabled(nextEnabled);

    if (nextEnabled) {
      const newTrack = await trackController.startAudioTrack();
      if (!newTrack) {
        mediaControls.setAudioEnabled(false);
        return;
      }

      if (!hasProducer('audio')) {
        const produced = await produceTrack(newTrack);
        if (!produced) {
          trackController.stopAudioTrack('Failed to publish microphone');
          mediaControls.setAudioEnabled(false);
          return;
        }
        resumeProducer('audio');
        return;
      }

      const replaced = await replaceTrack('audio', newTrack);
      if (!replaced) {
        trackController.stopAudioTrack('Failed to publish microphone');
        mediaControls.setAudioEnabled(false);
        return;
      }

      resumeProducer('audio');
    } else {
      if (hasProducer('audio')) {
        pauseProducer('audio');
      }

      await replaceTrack('audio', null);
      trackController.stopAudioTrack();
    }
  }, [trackController, produceTrack, mediaControls, hasProducer, pauseProducer, resumeProducer, replaceTrack]);

  return {
    sfuState,
    remotePeers,
    wasKicked,
    kickPeer,
    mediaControls,
    toggleVideo,
    toggleAudio,
  };
}
