import { QualityIndicator } from "@/components/room/quality-indicator";
import type { PeerQualityStore } from "@/features/room/contexts/peer-quality.store";
import { usePeerQuality } from "@/features/room/contexts/peer-quality.store";

interface Props {
  qualityStore: PeerQualityStore;
  userId: string;
}

export function RoomVideoQualityBadge({ qualityStore, userId }: Props) {
  const peerQuality = usePeerQuality(qualityStore, userId);

  if (!peerQuality) {
    return null;
  }

  return <QualityIndicator score={peerQuality.score} stats={peerQuality.stats} />;
}
