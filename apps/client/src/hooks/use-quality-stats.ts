import { useEffect, useState } from 'react';
import { useSfuManager } from '@/features/sfu/contexts/sfu-manager.context';
import type { PeerQualityStats } from '@/lib/sfu/types';

export interface UseQualityStatsOptions {
  enabled?: boolean;
}

export interface UseQualityStatsResult {
  peerStats: Map<string, PeerQualityStats>;
}

export function useQualityStats({ enabled = true }: UseQualityStatsOptions = {}): UseQualityStatsResult {
  const sfuManager = useSfuManager();
  const [peerStats, setPeerStats] = useState<Map<string, PeerQualityStats>>(new Map());

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const unsubscribe = sfuManager.onQualityStats((stats) => {
    setPeerStats(stats);
  });

    sfuManager.startStatsCollection(2000);

    return () => {
      unsubscribe();
      sfuManager.stopStatsCollection();
      setPeerStats(new Map());
    };
  }, [enabled, sfuManager]);

  return { peerStats };
}
