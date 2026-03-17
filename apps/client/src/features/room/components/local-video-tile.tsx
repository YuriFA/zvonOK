import { LocalVideo } from '@/components/local-video';
import { VideoTile } from '@/components/video-grid';
import { MediaControls } from '@/features/media/components/media-controls';
import type { MediaErrorType } from '@/features/media/hooks/use-media-errors';

interface LocalVideoTileProps {
  stream: MediaStream | null;
  username?: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isActiveSpeaker: boolean;
  videoError?: MediaErrorType;
  audioError?: MediaErrorType;
  onToggleVideo: () => Promise<void>;
  onToggleAudio: () => Promise<void>;
}

export function LocalVideoTile({
  stream,
  username,
  isVideoEnabled,
  isAudioEnabled,
  isActiveSpeaker,
  videoError,
  audioError,
  onToggleVideo,
  onToggleAudio,
}: LocalVideoTileProps) {
  return (
    <VideoTile isActiveSpeaker={isActiveSpeaker}>
      <LocalVideo
        stream={stream}
        username={username}
        isVideoEnabled={!videoError && isVideoEnabled}
        isAudioEnabled={!audioError && isAudioEnabled}
        className="h-full w-full"
        showControls={false}
      />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
        <MediaControls
          isVideoEnabled={isVideoEnabled}
          isAudioEnabled={isAudioEnabled}
          onToggleVideo={onToggleVideo}
          onToggleAudio={onToggleAudio}
          videoError={videoError}
          audioError={audioError}
        />
      </div>
    </VideoTile>
  );
}
