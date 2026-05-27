import { useSyncExternalStore } from "react";

type Listener = () => void;

const LEVEL_HYSTERESIS = 0.05;

function isLevelChangeSignificant(prev: number | undefined, next: number): boolean {
  if (prev === undefined) return true;
  if (prev === next) return false;
  if ((prev === 0) !== (next === 0)) return true;
  return Math.abs(prev - next) >= LEVEL_HYSTERESIS;
}

export class RoomAudioStore {
  private audioLevels = new Map<string, number>();
  private activeSpeakerId: string | null = null;

  private globalListeners = new Set<Listener>();
  private levelListeners = new Map<string, Set<Listener>>();

  setLevels(levels: Map<string, number>) {
    const changedIds: string[] = [];

    for (const [id, level] of levels) {
      if (isLevelChangeSignificant(this.audioLevels.get(id), level)) {
        changedIds.push(id);
      }
    }
    for (const id of this.audioLevels.keys()) {
      if (!levels.has(id)) {
        changedIds.push(id);
      }
    }

    this.audioLevels = levels;

    for (const id of changedIds) {
      const listeners = this.levelListeners.get(id);

      if (listeners) {
        for (const fn of listeners) {
          fn();
        }
      }
    }
  }

  setActiveSpeakerId(id: string | null) {
    if (this.activeSpeakerId === id) return;
    this.activeSpeakerId = id;
    for (const fn of this.globalListeners) {
      fn();
    }
  }

  reset() {
    this.audioLevels = new Map();
    this.activeSpeakerId = null;

    for (const fn of this.globalListeners) {
      fn();
    }

    for (const listeners of this.levelListeners.values()) {
      for (const fn of listeners) {
        fn();
      }
    }
  }

  getLevel(userId: string): number {
    return this.audioLevels.get(userId) ?? 0;
  }

  getActiveSpeakerId(): string | null {
    return this.activeSpeakerId;
  }

  subscribeGlobal(listener: Listener): () => void {
    this.globalListeners.add(listener);
    return () => {
      this.globalListeners.delete(listener);
    };
  }

  subscribeLevel(userId: string, listener: Listener): () => void {
    let set = this.levelListeners.get(userId);
    if (!set) {
      set = new Set();
      this.levelListeners.set(userId, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (set!.size === 0) {
        this.levelListeners.delete(userId);
      }
    };
  }
}

export function useAudioLevel(store: RoomAudioStore, userId: string): number {
  return useSyncExternalStore(
    (onStoreChange) => store.subscribeLevel(userId, onStoreChange),
    () => store.getLevel(userId),
  );
}

export function useActiveSpeakerId(store: RoomAudioStore): string | null {
  return useSyncExternalStore(
    (onStoreChange) => store.subscribeGlobal(onStoreChange),
    () => store.getActiveSpeakerId(),
  );
}
