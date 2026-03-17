import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Video, VideoOff, Mic, MicOff, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MediaErrorType } from '@/features/media/hooks/use-media-errors';

function getVideoTooltipText(
  isVideoEnabled: boolean,
  videoError: MediaErrorType
): string {
  if (videoError === 'no-device') return 'No camera found';
  if (videoError === 'permission-denied') return 'Camera permission denied';
  if (videoError === 'error') return 'Camera unavailable';
  return isVideoEnabled ? 'Turn off camera' : 'Turn on camera';
}

function getAudioTooltipText(
  isAudioEnabled: boolean,
  audioError: MediaErrorType
): string {
  if (audioError === 'no-device') return 'No microphone found';
  if (audioError === 'permission-denied') return 'Microphone permission denied';
  if (audioError === 'error') return 'Microphone unavailable';
  return isAudioEnabled ? 'Mute microphone' : 'Unmute microphone';
}

export interface MediaControlsProps {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  disabled?: boolean;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
  videoError?: MediaErrorType;
  audioError?: MediaErrorType;
}

export function MediaControls({
  isVideoEnabled,
  isAudioEnabled,
  onToggleVideo,
  onToggleAudio,
  disabled = false,
  className,
  size = 'icon',
  variant = 'secondary',
  videoError = null,
  audioError = null,
}: MediaControlsProps) {
  const videoTooltipText = getVideoTooltipText(isVideoEnabled, videoError);
  const audioTooltipText = getAudioTooltipText(isAudioEnabled, audioError);
  const videoIsWarning = videoError === 'no-device';
  const audioIsWarning = audioError === 'no-device';

  return (
    <div className={cn('flex gap-2', className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={videoError && !videoIsWarning ? 'destructive' : variant}
            size={size}
            onClick={onToggleVideo}
            disabled={disabled}
            aria-label={videoTooltipText}
          >
            {videoError ? (
              <AlertTriangle className={cn('size-4', videoIsWarning && 'text-yellow-500')} />
            ) : isVideoEnabled ? (
              <Video className="size-4" />
            ) : (
              <VideoOff className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{videoTooltipText}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={audioError && !audioIsWarning ? 'destructive' : variant}
            size={size}
            onClick={onToggleAudio}
            disabled={disabled}
            aria-label={audioTooltipText}
          >
            {audioError ? (
              <AlertTriangle className={cn('size-4', audioIsWarning && 'text-yellow-500')} />
            ) : isAudioEnabled ? (
              <Mic className="size-4" />
            ) : (
              <MicOff className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{audioTooltipText}</TooltipContent>
      </Tooltip>
    </div>
  );
}
