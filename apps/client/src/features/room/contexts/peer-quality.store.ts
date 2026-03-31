import { useSyncExternalStore } from "react";

import type { PeerQualityStats } from "@/lib/sfu/types";

type Listener = () => void;

export class PeerQualityStore {
  private stats = new Map<string, PeerQualityStats>();
  private listeners = new Map<string, Set<Listener>>();

  setStats(stats: Map<string, PeerQualityStats>) {
    const changedIds: string[] = [];

    for (const [id, s] of stats) {
      const prev = this.stats.get(id);
      if (!prev || prev.score.score !== s.score.score || prev.score.level !== s.score.level) {
        changedIds.push(id);
      }
    }

    for (const id of this.stats.keys()) {
      if (!stats.has(id)) {
        changedIds.push(id);
      }
    }

    this.stats = stats;

    for (const id of changedIds) {
      const listeners = this.listeners.get(id);
      if (listeners) {
        for (const fn of listeners) {
          fn();
        }
      }
    }
  }

  reset() {
    this.stats = new Map();
    for (const listeners of this.listeners.values()) {
      for (const fn of listeners) {
        fn();
      }
    }
  }

  getPeerStats(userId: string): PeerQualityStats | undefined {
    return this.stats.get(userId);
  }

  subscribePeer(userId: string, listener: Listener): () => void {
    let set = this.listeners.get(userId);
    if (!set) {
      set = new Set();
      this.listeners.set(userId, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (set!.size === 0) {
        this.listeners.delete(userId);
      }
    };
  }
}

export function usePeerQuality(
  store: PeerQualityStore,
  userId: string,
): PeerQualityStats | undefined {
  return useSyncExternalStore(
    (onStoreChange) => store.subscribePeer(userId, onStoreChange),
    () => store.getPeerStats(userId),
  );
}
