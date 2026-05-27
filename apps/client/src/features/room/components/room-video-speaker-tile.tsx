import { VideoTile } from "@/components/video-grid";
import type { RoomAudioStore } from "@/features/room/contexts/room-audio.store";
import { useActiveSpeakerId } from "@/features/room/contexts/room-audio.store";

interface Props extends React.ComponentProps<"div"> {
  audioStore: RoomAudioStore;
  userId: string;
}

export function RoomVideoSpeakerTile({ audioStore, userId, children, ...rest }: Props) {
  const activeSpeakerId = useActiveSpeakerId(audioStore);

  return (
    <VideoTile isActiveSpeaker={activeSpeakerId === userId} {...rest}>
      {children}
    </VideoTile>
  );
}
