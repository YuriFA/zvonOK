import { Mic, MicOff } from "lucide-react";
import { useEffect, useRef } from "react";

import { QualityIndicator } from "@/components/room/quality-indicator";
import { VideoTile } from "@/components/video-grid";
import { AudioLevelRings } from "@/features/room/components/audio-level-rings";
import { getInitials, getAvatarColor } from "@/lib/utils/display-name";

import { usePeerQualityContext } from "../contexts/peer-quality.context";
import { usePeerQuality } from "../contexts/peer-quality.store";
import { useRoomAudioContext } from "../contexts/room-audio.context";
import { useAudioLevel, useActiveSpeakerId } from "../contexts/room-audio.store";

interface Props extends React.ComponentProps<"div"> {
  userId: string;
  stream: MediaStream | null;
  username?: string;
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
}

export function RoomVideo({
  userId,
  stream,
  username,
  isVideoEnabled,
  isAudioEnabled,
  style,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { store: audioStore } = useRoomAudioContext();
  const { store: qualityStore } = usePeerQualityContext();
  const audioLevel = useAudioLevel(audioStore, userId);
  const activeSpeakerId = useActiveSpeakerId(audioStore);
  const peerQuality = usePeerQuality(qualityStore, userId);
  const avatarColor = getAvatarColor(username ?? "");

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <VideoTile isActiveSpeaker={activeSpeakerId === userId} style={style}>
      <div className="relative size-full overflow-hidden rounded-lg bg-muted">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />

        {!isVideoEnabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted select-none">
            <AudioLevelRings level={audioLevel} color={avatarColor} className="z-0" />
            <div
              className="relative z-10 flex size-16 items-center justify-center rounded-full text-xl text-black dark:text-white"
              style={{ backgroundColor: avatarColor }}
            >
              {getInitials(username ?? "")}
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
        <div className="absolute right-2 bottom-2 flex gap-1">
          {peerQuality && <QualityIndicator score={peerQuality.score} stats={peerQuality.stats} />}
          <div className="rounded bg-black/50 px-2 py-1 text-white">
            {isAudioEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />}
          </div>
        </div>
      </div>
    </VideoTile>
  );
}
