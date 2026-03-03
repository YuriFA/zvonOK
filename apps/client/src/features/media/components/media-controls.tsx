import { Button } from '@/components/ui/button';
import { Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MediaControlsProps {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  disabled?: boolean;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
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
}: MediaControlsProps) {
  return (
    <div className={cn('flex gap-2', className)}>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={onToggleVideo}
        disabled={disabled}
        title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
      >
        {isVideoEnabled ? (
          <Video className="size-4" />
        ) : (
          <VideoOff className="size-4" />
        )}
      </Button>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={onToggleAudio}
        disabled={disabled}
        title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
      >
        {isAudioEnabled ? (
          <Mic className="size-4" />
        ) : (
          <MicOff className="size-4" />
        )}
      </Button>
    </div>
  );
}
