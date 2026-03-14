import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LocalVideo } from '@/components/local-video';
import { useMediaControls } from '../hooks/use-media-controls';
import { useMediaPermissions } from '../hooks/use-media-permissions';
import { DeviceSettingsPanel } from './device-settings-panel';

interface DeviceSelectorProps {
  className?: string;
}

export function DeviceSelector({ className }: DeviceSelectorProps) {
  const { stream, startMedia, stopMedia, isLoading, error } = useMediaPermissions();
  const mediaControls = useMediaControls();

  useEffect(() => {
    startMedia()

    return () => {
      stopMedia();
    };
  }, [startMedia, stopMedia]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Video Preview */}
      <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading camera...</p>
          </div>
        )}
        {error && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-destructive">{error.message}</p>
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

        {/* Toggle Buttons */}
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
