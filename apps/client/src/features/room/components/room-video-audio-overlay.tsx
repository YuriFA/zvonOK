import { AudioLevelRings } from "@/features/room/components/audio-level-rings";
import type { RoomAudioStore } from "@/features/room/contexts/room-audio.store";
import { useAudioLevel } from "@/features/room/contexts/room-audio.store";
import { getAvatarColor, getInitials } from "@/lib/utils/display-name";

interface Props {
  audioStore: RoomAudioStore;
  userId: string;
  username?: string;
}

export function RoomVideoAudioOverlay({ audioStore, userId, username }: Props) {
  const audioLevel = useAudioLevel(audioStore, userId);
  const avatarColor = getAvatarColor(username ?? "");

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-muted select-none">
      <AudioLevelRings level={audioLevel} color={avatarColor} className="z-0" />
      <div
        className="relative z-10 flex size-16 items-center justify-center rounded-full text-xl text-black dark:text-white"
        style={{ backgroundColor: avatarColor }}
      >
        {getInitials(username ?? "")}
      </div>
    </div>
  );
}
