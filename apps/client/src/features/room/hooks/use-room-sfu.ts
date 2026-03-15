import { useCallback, useEffect } from 'react';
import { useMediasoup, type RemotePeerMedia } from '@/hooks/use-mediasoup';
import type { UseMediaControlsReturn } from '@/features/media/hooks/use-media-controls';
import type { SfuState } from '@/lib/sfu/types';

export interface UseRoomSfuOptions {
  roomId: string;
  roomOwnerId: string;
  localStream: MediaStream | null;
  mediaControls: UseMediaControlsReturn;
  onKicked: () => void;
}

export interface UseRoomSfuResult {
  sfuState: SfuState;
  remotePeers: RemotePeerMedia[];
  wasKicked: boolean;
  kickPeer: (userId: string) => void;
  handleToggleVideo: () => Promise<void>;
  handleToggleAudio: () => Promise<void>;
}

/**
 * Manages the SFU connection lifecycle and hardware media toggling.
 * Bridge layer between mediaControls (UI state) and useMediasoup (SFU).
 */
export function useRoomSfu({
  roomId,
  roomOwnerId,
  localStream,
  mediaControls,
  onKicked,
}: UseRoomSfuOptions): UseRoomSfuResult {
  const {
    state: sfuState,
    remotePeers,
    toggleVideoWithHardware,
    toggleAudioWithHardware,
    kickPeer,
    wasKicked,
  } = useMediasoup({
    roomId,
    roomOwnerId,
    localStream,
  });

  useEffect(() => {
    if (wasKicked) {
      onKicked();
    }
  }, [wasKicked, onKicked]);

  const handleToggleVideo = useCallback(async () => {
    const nextEnabled = !mediaControls.isVideoEnabled;
    mediaControls.setVideoEnabled(nextEnabled);
    const success = await toggleVideoWithHardware(nextEnabled);
    if (!success && nextEnabled) {
      mediaControls.setVideoEnabled(false);
    }
  }, [mediaControls, toggleVideoWithHardware]);

  const handleToggleAudio = useCallback(async () => {
    const nextEnabled = !mediaControls.isAudioEnabled;
    mediaControls.setAudioEnabled(nextEnabled);
    const success = await toggleAudioWithHardware(nextEnabled);
    if (!success && nextEnabled) {
      mediaControls.setAudioEnabled(false);
    }
  }, [mediaControls, toggleAudioWithHardware]);

  return {
    sfuState,
    remotePeers,
    wasKicked,
    kickPeer,
    handleToggleVideo,
    handleToggleAudio,
  };
}
