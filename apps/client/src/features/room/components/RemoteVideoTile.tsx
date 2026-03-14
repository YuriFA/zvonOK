import { RemoteVideo } from '@/components/remote-video';
import { VideoTile } from '@/components/video-grid';
import type { RemotePeerMedia } from '@/hooks/use-mediasoup';
import type { SfuConnectionState } from '@/lib/sfu/types';

interface RemoteVideoTileProps {
  peer: RemotePeerMedia;
  isActiveSpeaker: boolean;
  connectionState: SfuConnectionState;
  onMediaElement: (peerId: string, element: HTMLVideoElement | null) => void;
}

export function RemoteVideoTile({
  peer,
  isActiveSpeaker,
  connectionState,
  onMediaElement,
}: RemoteVideoTileProps) {
  return (
    <VideoTile isActiveSpeaker={isActiveSpeaker}>
      <RemoteVideo
        stream={peer.stream}
        username={peer.username}
        isVideoEnabled={peer.isVideoEnabled}
        isAudioEnabled={peer.isAudioEnabled}
        onMediaElement={(element) => onMediaElement(peer.userId, element)}
        className="h-full w-full"
      />
      {connectionState !== 'connected' && (
        <div className="absolute top-2 right-2 rounded bg-black/50 px-1.5 py-0.5 text-xs text-white">
          {connectionState === 'connecting' ? 'Connecting...' : connectionState}
        </div>
      )}
    </VideoTile>
  );
}
