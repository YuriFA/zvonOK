import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { getInitials, getAvatarColor } from '@/lib/utils/display-name';
import { AudioLevelRings } from '@/components/audio-level-rings';
import { Mic, MicOff } from 'lucide-react';

interface Props {
  stream: MediaStream | null;
  username?: string;
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
  audioLevel?: number;
  className?: string;
}

export function RemoteVideo({
  stream,
  username,
  isVideoEnabled,
  isAudioEnabled,
  audioLevel = 0,
  className,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-muted', className)}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover"
      />

      {!isVideoEnabled && (
        <div className="absolute inset-0 flex items-center justify-center select-none bg-muted">
          <AudioLevelRings
            level={audioLevel}
            color={getAvatarColor(username ?? '')}
            className="z-0"
          />
          <div className="relative z-10 flex size-16 items-center justify-center rounded-full text-xl text-black dark:text-white" style={{ backgroundColor: getAvatarColor(username ?? '') }}>
            {getInitials(username ?? '')}
          </div>
        </div>
      )}

      {/* Username overlay */}
      {username && (
        <div className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-1 text-xs text-white">
          {username}
        </div>
      )}

      {/* Media state indicators */}
      <div className="absolute bottom-2 right-2 flex gap-1">
        <div
          className="rounded px-2 py-1 bg-black/50 text-white"
        >
          {isAudioEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />}
        </div>
      </div>
    </div>
  );
}
