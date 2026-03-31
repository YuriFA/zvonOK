import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Video, VideoOff, Mic, MicOff, AlertTriangle, Loader2, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CaptureState, getCaptureStateDisplay, isActive } from '@/lib/media/capture-state';
import { LinkButton } from '@/components/ui/link-button';

interface Props {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  videoCaptureState: CaptureState;
  audioCaptureState: CaptureState;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
}

export function RoomCenterControls({
  isVideoEnabled,
  isAudioEnabled,
  videoCaptureState,
  audioCaptureState,
  onToggleVideo,
  onToggleAudio,
  className,
  size = 'icon',
  variant = 'outline',
}: Props) {
  const videoDisplay = getCaptureStateDisplay(videoCaptureState, 'video');
  const audioDisplay = getCaptureStateDisplay(audioCaptureState, 'audio');

  const renderVideoIcon = () => {
    if (videoDisplay.icon === 'spinner') return <Loader2 className="size-4 animate-spin" />;
    if (videoDisplay.icon === 'off-warning') return <AlertTriangle className="size-4 text-yellow-500" />;
    if (videoDisplay.icon === 'off-error') return <AlertTriangle className="size-4 text-destructive" />;
    return isVideoEnabled ? <Video className="size-4" /> : <VideoOff className="size-4" />;
  };

  const renderAudioIcon = () => {
    if (audioDisplay.icon === 'spinner') return <Loader2 className="size-4 animate-spin" />;
    if (audioDisplay.icon === 'off-warning') return <AlertTriangle className="size-4 text-yellow-500" />;
    if (audioDisplay.icon === 'off-error') return <AlertTriangle className="size-4 text-destructive" />;
    return isAudioEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />;
  };

  const videoHasError = videoDisplay.variant !== 'default' && !isActive(videoCaptureState);
  const audioHasError = audioDisplay.variant !== 'default' && !isActive(audioCaptureState);
  const videoIsWarning = videoDisplay.variant === 'warning';
  const audioIsWarning = audioDisplay.variant === 'warning';

  return (
    <div className={cn('flex gap-2', className)}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant={videoHasError && !videoIsWarning ? 'destructive' : variant}
              size={size}
              onClick={onToggleVideo}
              aria-label={videoDisplay.tooltip}
            />
          }
        >
          {renderVideoIcon()}
        </TooltipTrigger>
        <TooltipContent>{videoDisplay.tooltip}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant={audioHasError && !audioIsWarning ? 'destructive' : variant}
              size={size}
              onClick={onToggleAudio}
              aria-label={audioDisplay.tooltip}
            />
          }
        >
          {renderAudioIcon()}
        </TooltipTrigger>
        <TooltipContent>{audioDisplay.tooltip}</TooltipContent>
      </Tooltip>

      <LinkButton to="/" variant="destructive" size={size} className="ml-2" aria-label="Leave room">
        <PhoneOff className="size-4" />
      </LinkButton>
    </div>
  );
}
