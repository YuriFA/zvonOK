/**
 * Participants hook: peer join/leave and track subscribe/unsubscribe as
 * React state, grouped per participant by media source. Thin React binding
 * over the framework-free RoomTracker.
 */

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import { EMPTY_ROOM_STATE, RoomTracker } from "./room-tracker.js";
import type { ZvonokParticipant } from "./types.js";
import { useZvonokSession } from "./zvonok-context.js";

export interface UseParticipantsResult {
  participants: ZvonokParticipant[];
}

export function useParticipants(): UseParticipantsResult {
  const session = useZvonokSession();
  const manager = session.manager;
  const tracker = useMemo(() => (manager ? new RoomTracker(manager) : null), [manager]);

  useEffect(() => () => tracker?.stop(), [tracker]);

  const subscribe = useCallback(
    (listener: () => void) => tracker?.subscribe(listener) ?? (() => {}),
    [tracker],
  );
  const getSnapshot = useCallback(() => tracker?.getSnapshot() ?? EMPTY_ROOM_STATE, [tracker]);
  const state = useSyncExternalStore(subscribe, getSnapshot);

  return { participants: state.participants };
}
