import { useEffect, useRef } from "react";

export interface ScreenShareSpotlightProps {
  stream: MediaStream;
  sharerName: string;
  isLocal: boolean;
  style?: React.CSSProperties;
}

export function ScreenShareSpotlight({
  stream,
  sharerName,
  isLocal,
  style,
}: ScreenShareSpotlightProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative overflow-hidden rounded-lg bg-black" style={style}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="h-full w-full object-contain"
      />
      <div className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-1 text-sm text-white">
        {sharerName} — sharing screen
      </div>
    </div>
  );
}
