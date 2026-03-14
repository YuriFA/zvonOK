import { LocalVideo } from '@/components/local-video';
import { VideoTile } from '@/components/video-grid';
import { MediaControls } from '@/features/media/components/media-controls';

interface LocalVideoTileProps {
  stream: MediaStream | null;
  username?: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isActiveSpeaker: boolean;
  mediaError: string | null;
  onToggleVideo: () => Promise<void>;
  onToggleAudio: () => Promise<void>;
}

export function LocalVideoTile({
  stream,
  username,
  isVideoEnabled,
  isAudioEnabled,
  isActiveSpeaker,
  mediaError,
  onToggleVideo,
  onToggleAudio,
}: LocalVideoTileProps) {
  return (
    <VideoTile isActiveSpeaker={isActiveSpeaker}>
      <LocalVideo
        stream={stream}
        username={username}
        isVideoEnabled={!mediaError && isVideoEnabled}
        isAudioEnabled={!mediaError && isAudioEnabled}
        className="h-full w-full"
        showControls={false}
      />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
        <MediaControls
          isVideoEnabled={isVideoEnabled}
          isAudioEnabled={isAudioEnabled}
          onToggleVideo={onToggleVideo}
          onToggleAudio={onToggleAudio}
        />
      </div>
    </VideoTile>
  );
}
