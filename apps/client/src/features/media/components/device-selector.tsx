import { useMediaStream } from '../hooks/use-media-stream';
import { useMediaControls } from '../hooks/use-media-controls';
import { DeviceSettingsPanel } from './device-settings-panel';
import { Button } from '@/components/ui/button';
import { LocalVideo } from '@/components/local-video';
import { cn } from '@/lib/utils';
import { Video, VideoOff, Mic, MicOff } from 'lucide-react';

interface DeviceSelectorProps {
  className?: string;
}

export function DeviceSelector({ className }: DeviceSelectorProps) {
  const { stream, error, isLoading } = useMediaStream();
  const mediaControls = useMediaControls();

  return (
    <div className={cn('space-y-4', className)}>
      <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading camera...</p>
          </div>
        )}
        {error && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        {!isLoading && !error && stream && (
          <LocalVideo
            stream={stream}
            isVideoEnabled={mediaControls.isVideoEnabled}
            isAudioEnabled={mediaControls.isAudioEnabled}
            className="h-full"
            showControls={false}
          />
        )}

        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => void mediaControls.toggleVideo()}
            disabled={!stream || !!error}
          >
            {mediaControls.isVideoEnabled ? (
              <Video className="size-5" />
            ) : (
              <VideoOff className="size-5" />
            )}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => void mediaControls.toggleAudio()}
            disabled={!stream || !!error}
          >
            {mediaControls.isAudioEnabled ? (
              <Mic className="size-5" />
            ) : (
              <MicOff className="size-5" />
            )}
          </Button>
        </div>
      </div>

      <DeviceSettingsPanel
        variant="inline"
        isVideoEnabled={mediaControls.isVideoEnabled}
        isAudioEnabled={mediaControls.isAudioEnabled}
      />
    </div>
  );
}
