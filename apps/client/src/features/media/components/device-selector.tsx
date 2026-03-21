import { useCallback, useState } from 'react';
import { useMediaControls } from '../hooks/use-media-controls';
import { DeviceSettingsPanel } from './device-settings-panel';
import { Button } from '@/components/ui/button';
import { LocalVideo } from '@/components/local-video';
import { cn } from '@/lib/utils';
import { Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { useMediaStreamContext } from '../contexts/media-stream.context';
import { useMediaToggle } from '../contexts/media-manager.context';

interface DeviceSelectorProps {
  className?: string;
}

export function DeviceSelector({ className }: DeviceSelectorProps) {
  const { stream, error, isLoading, start } = useMediaStreamContext();
  const mediaToggle = useMediaToggle();
  const mediaControls = useMediaControls();
  const [retrying, setRetrying] = useState(false);

  const handleToggleVideo = useCallback(async () => {
    const nextEnabled = !mediaControls.isVideoEnabled;
    mediaControls.setVideoEnabled(nextEnabled);
    const success = await mediaToggle.toggleVideo(nextEnabled);
    if (!success) {
      mediaControls.setVideoEnabled(false);
    }
  }, [mediaToggle, mediaControls]);

  const handleToggleAudio = useCallback(async () => {
    const nextEnabled = !mediaControls.isAudioEnabled;
    mediaControls.setAudioEnabled(nextEnabled);
    const success = await mediaToggle.toggleAudio(nextEnabled);
    if (!success) {
      mediaControls.setAudioEnabled(false);
    }
  }, [mediaToggle, mediaControls]);

  // Retry media acquisition from a direct user gesture.
  // On iOS WebKit, getUserMedia requires a recent user interaction (tap).
  // If the initial auto-start failed (e.g. no gesture context on page load),
  // this gives the user a button to tap that triggers a fresh request.
  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      await start();
    } finally {
      setRetrying(false);
    }
  }, [start]);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading camera...</p>
          </div>
        )}
        {error && !stream && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4">
            <p className="text-center text-sm text-destructive">{error}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleRetry}
              disabled={retrying}
            >
              {retrying ? 'Requesting...' : 'Allow Camera & Microphone'}
            </Button>
          </div>
        )}
        {!isLoading && !error && !stream && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4">
            <p className="text-center text-sm text-muted-foreground">
              Tap the button below to enable your camera and microphone.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleRetry}
              disabled={retrying}
            >
              {retrying ? 'Requesting...' : 'Allow Camera & Microphone'}
            </Button>
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
            onClick={handleToggleVideo}
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
            onClick={handleToggleAudio}
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
