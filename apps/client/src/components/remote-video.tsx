import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface RemoteVideoProps {
  stream: MediaStream | null;
  username?: string;
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
  onMediaElement?: (element: HTMLVideoElement | null) => void;
  className?: string;
}

export function RemoteVideo({
  stream,
  username,
  isVideoEnabled = true,
  isAudioEnabled = true,
  onMediaElement,
  className,
}: RemoteVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onMediaElementRef = useRef(onMediaElement);
  onMediaElementRef.current = onMediaElement;

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    onMediaElementRef.current?.(videoRef.current);
    return () => {
      onMediaElementRef.current?.(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-black', className)}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="h-full w-full object-cover"
      >
        <track kind="captions" />
      </video>

      {/* Username overlay */}
      {username && (
        <div className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-1 text-xs text-white">
          {username}
        </div>
      )}

      {/* Media state indicators */}
      <div className="absolute bottom-2 right-2 flex gap-1">
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

      {/* No video fallback */}
      {!isVideoEnabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex size-16 items-center justify-center rounded-full bg-gray-700 text-xl text-white">
            {username?.charAt(0).toUpperCase() ?? '?'}
          </div>
        </div>
      )}
    </div>
  );
}
