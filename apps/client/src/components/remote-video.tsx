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

/**
 * Attempt to play a media element, retrying on the next user interaction
 * if autoplay is blocked (common on iOS WebKit).
 */
function safePlay(element: HTMLMediaElement): void {
  const playPromise = element.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {
      // Autoplay was prevented; retry on next user interaction.
      const resumePlayback = () => {
        element.play().catch(() => {});
        document.removeEventListener('touchstart', resumePlayback);
        document.removeEventListener('click', resumePlayback);
      };
      document.addEventListener('touchstart', resumePlayback, { once: true });
      document.addEventListener('click', resumePlayback, { once: true });
    });
  }
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
  const audioRef = useRef<HTMLAudioElement>(null);
  const onMediaElementRef = useRef(onMediaElement);
  onMediaElementRef.current = onMediaElement;

  // Attach video-only stream to the muted <video> element.
  // The element is muted so iOS Safari allows autoplay without a gesture.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    // Create a video-only MediaStream to feed the muted <video> element.
    // This avoids double-playing audio (once via <video>, once via <audio>).
    const videoOnlyStream = new MediaStream(stream.getVideoTracks());
    video.srcObject = videoOnlyStream;
    safePlay(video);

    // When the underlying stream gains/loses video tracks (mediasoup mutates
    // the MediaStream in-place), update the video-only mirror and re-trigger
    // play() so iOS WebKit resumes rendering.
    const syncVideoTracks = () => {
      const current = new Set(videoOnlyStream.getVideoTracks());
      const latest = stream.getVideoTracks();

      // Add new tracks
      for (const t of latest) {
        if (!current.has(t)) {
          videoOnlyStream.addTrack(t);
        }
      }
      // Remove stale tracks
      for (const t of current) {
        if (!latest.includes(t)) {
          videoOnlyStream.removeTrack(t);
        }
      }

      safePlay(video);
    };

    stream.addEventListener('addtrack', syncVideoTracks);
    stream.addEventListener('removetrack', syncVideoTracks);

    return () => {
      stream.removeEventListener('addtrack', syncVideoTracks);
      stream.removeEventListener('removetrack', syncVideoTracks);
    };
  }, [stream]);

  // Attach audio-only stream to a separate <audio> element.
  // This element is NOT muted so the user can hear the remote peer.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !stream) return;

    const audioOnlyStream = new MediaStream(stream.getAudioTracks());
    audio.srcObject = audioOnlyStream;
    safePlay(audio);

    const syncAudioTracks = () => {
      const current = new Set(audioOnlyStream.getAudioTracks());
      const latest = stream.getAudioTracks();

      for (const t of latest) {
        if (!current.has(t)) {
          audioOnlyStream.addTrack(t);
        }
      }
      for (const t of current) {
        if (!latest.includes(t)) {
          audioOnlyStream.removeTrack(t);
        }
      }

      safePlay(audio);
    };

    stream.addEventListener('addtrack', syncAudioTracks);
    stream.addEventListener('removetrack', syncAudioTracks);

    return () => {
      stream.removeEventListener('addtrack', syncAudioTracks);
      stream.removeEventListener('removetrack', syncAudioTracks);
    };
  }, [stream]);

  useEffect(() => {
    onMediaElementRef.current?.(videoRef.current);
    return () => {
      onMediaElementRef.current?.(null);
    };
  }, []);

  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-black', className)}>
      {/* Muted video element — iOS Safari allows autoplay for muted video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover"
      >
        <track kind="captions" />
      </video>

      {/* Separate audio element for remote peer's sound */}
      <audio ref={audioRef} autoPlay playsInline>
        <track kind="captions" />
      </audio>

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
