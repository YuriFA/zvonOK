import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface LocalVideoProps {
  stream: MediaStream | null;
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
  className?: string;
  showControls?: boolean;
}

export function LocalVideo({
  stream,
  isVideoEnabled = true,
  isAudioEnabled = true,
  className,
  showControls = true,
}: LocalVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-black', className)}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover mirror"
      />

      {showControls && (
        <div className="absolute bottom-2 left-2 flex gap-1">
          <div
            className={cn(
              'rounded px-1.5 py-0.5 text-xs font-medium',
              isVideoEnabled
                ? 'bg-green-500/80 text-white'
                : 'bg-red-500/80 text-white'
            )}
          >
            {isVideoEnabled ? 'Cam' : 'Cam Off'}
          </div>
          <div
            className={cn(
              'rounded px-1.5 py-0.5 text-xs font-medium',
              isAudioEnabled
                ? 'bg-green-500/80 text-white'
                : 'bg-red-500/80 text-white'
            )}
          >
            {isAudioEnabled ? 'Mic' : 'Muted'}
          </div>
        </div>
      )}

      {!isVideoEnabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <span className="text-sm text-white">Camera Off</span>
        </div>
      )}
    </div>
  );
}
