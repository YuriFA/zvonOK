import { LocalVideo } from '@/components/local-video';
import { VideoTile } from '@/components/video-grid';
import { MediaControls } from '@/features/media/components/media-controls';
import { CaptureState, isActive } from '@/lib/media/capture-state';

interface LocalVideoTileProps {
  stream: MediaStream | null;
  username?: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  videoCaptureState: CaptureState;
  audioCaptureState: CaptureState;
  isActiveSpeaker: boolean;
  onToggleVideo: () => Promise<void>;
  onToggleAudio: () => Promise<void>;
}

export function LocalVideoTile({
  stream,
  username,
  isVideoEnabled,
  isAudioEnabled,
  videoCaptureState,
  audioCaptureState,
  isActiveSpeaker,
  onToggleVideo,
  onToggleAudio,
}: LocalVideoTileProps) {
  return (
    <VideoTile isActiveSpeaker={isActiveSpeaker}>
      <LocalVideo
        stream={stream}
        username={username}
        isVideoEnabled={isActive(videoCaptureState)}
        className="h-full w-full"
      />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
        <MediaControls
          isVideoEnabled={isVideoEnabled}
          isAudioEnabled={isAudioEnabled}
          videoCaptureState={videoCaptureState}
          audioCaptureState={audioCaptureState}
          onToggleVideo={onToggleVideo}
          onToggleAudio={onToggleAudio}
        />
      </div>
    </VideoTile>
  );
}
