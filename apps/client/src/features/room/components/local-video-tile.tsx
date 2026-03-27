import { LocalVideo } from '@/components/local-video';
import { VideoTile } from '@/components/video-grid';

interface LocalVideoTileProps {
  stream: MediaStream | null;
  username?: string;
  isActiveSpeaker: boolean;
  isVideoEnabled: boolean;
}

export function LocalVideoTile({
  stream,
  username,
  isVideoEnabled,
  isActiveSpeaker,
}: LocalVideoTileProps) {
  return (
    <VideoTile isActiveSpeaker={isActiveSpeaker}>
      <LocalVideo
        stream={stream}
        username={username}
        isVideoEnabled={isVideoEnabled}
        className="h-full w-full"
      />
    </VideoTile>
  );
}
