import { useEffect, useState } from 'react';
import { sfuManager } from '@/lib/sfu/manager';
import type { PeerQualityStats } from '@/lib/sfu/types';

export interface UseQualityStatsOptions {
  enabled?: boolean;
}

export interface UseQualityStatsResult {
  peerStats: Map<string, PeerQualityStats>;
}

export function useQualityStats({ enabled = true }: UseQualityStatsOptions = {}): UseQualityStatsResult {
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
  }, [enabled]);

  return { peerStats };
}
