import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils/display-name';

interface Props {
  stream: MediaStream | null;
  username?: string;
  isVideoEnabled: boolean;
  className?: string;
}

export function LocalVideo({
  stream,
  username,
  isVideoEnabled,
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
        style={{ backgroundColor: 'transparent' }}
        className="h-full w-full object-cover mirror"
      />

      {!isVideoEnabled && (
        <div className="absolute inset-0 flex items-center justify-center select-none bg-muted">
          <div className="flex size-16 items-center justify-center rounded-full bg-gray-500 text-xl text-white">
            {getInitials(username ?? '')}
          </div>
        </div>
      )}
    </div>
  );
}
