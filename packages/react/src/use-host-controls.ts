/**
 * Host control actions: mute one/all, room lock, kick.
 * Thin React binding over the framework-free createHostControls factory.
 * Denials arrive as sfu:host-error on the requesting socket and reject with
 * ZvonokHostError.
 */

import { useMemo } from "react";

import { createHostControls } from "./host-controls.js";
import { useZvonokSession } from "./zvonok-context.js";

export interface UseHostControlsResult {
  mutePeer(userId: string): Promise<void>;
  muteAll(): Promise<void>;
  lockRoom(locked: boolean): Promise<void>;
  kickPeer(userId: string): void;
}

export function useHostControls(): UseHostControlsResult {
  const session = useZvonokSession();
  const controls = useMemo(() => createHostControls(session.manager), [session.manager]);
  return controls;
}
