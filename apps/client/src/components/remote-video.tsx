import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface RemoteVideoProps {
  stream: MediaStream | null;
  username?: string;
  className?: string;
}

export function RemoteVideo({ stream, username, className }: RemoteVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideo = stream?.getVideoTracks().some((track) => track.enabled) ?? false;
  const hasAudio = stream?.getAudioTracks().some((track) => track.enabled) ?? false;

  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-black', className)}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="h-full w-full object-cover"
      />

      {/* Username overlay */}
      {username && (
        <div className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-1 text-xs text-white">
          {username}
        </div>
      )}

      {/* Audio indicator */}
      <div className="absolute bottom-2 right-2">
        <div
          className={cn(
            'rounded px-1.5 py-0.5 text-xs font-medium',
            hasAudio
              ? 'bg-green-500/80 text-white'
              : 'bg-red-500/80 text-white'
          )}
        >
          {hasAudio ? 'Mic' : 'Muted'}
        </div>
      </div>

      {/* No video fallback */}
      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex size-16 items-center justify-center rounded-full bg-gray-700 text-xl text-white">
            {username?.charAt(0).toUpperCase() ?? '?'}
          </div>
        </div>
      )}
    </div>
  );
}
