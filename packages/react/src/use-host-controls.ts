/**
 * Host control actions: mute one/all, room lock, kick.
 * Denials arrive as sfu:host-error on the requesting socket and reject with
 * ZvonokHostError.
 */

import type { Socket } from "socket.io-client";
import type { SfuManager } from "@zvonok/client/sfu/manager";
import { useCallback } from "react";

import { ZvonokHostError } from "./errors.js";
import { useZvonokSession } from "./zvonok-context.js";

/** How long to wait for a denial before considering the action accepted. */
const HOST_ACTION_TIMEOUT_MS = 3000;

export interface UseHostControlsResult {
  mutePeer(userId: string): Promise<void>;
  muteAll(): Promise<void>;
  lockRoom(locked: boolean): Promise<void>;
  kickPeer(userId: string): void;
}

/**
 * Emits a host action and settles on the first sfu:host-error denial, or
 * resolves once the denial window elapses (accepted and fire-and-forget
 * actions both resolve; a missing mute target is silently ignored
 * server-side, mirroring kick semantics).
 */
function emitHostAction(
  socket: Socket,
  event: "sfu:mute-peer" | "sfu:mute-all" | "sfu:lock-room",
  payload: Record<string, string | boolean>,
  timeoutMs: number,
): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  const cleanup = () => {
    clearTimeout(timer);
    socket.off("sfu:host-error", onHostError);
  };
  const timer = setTimeout(() => {
    cleanup();
    resolve();
  }, timeoutMs);
  const onHostError = (payload: unknown) => {
    const { code, message } = (payload ?? {}) as { code?: string; message?: string };
    cleanup();
    reject(
      new ZvonokHostError(
        code ?? "HOST_ACTION_FAILED",
        message ?? "The server denied the host action",
      ),
    );
  };
  socket.on("sfu:host-error", onHostError);
  socket.emit(event, payload);
  return promise;
}

function requireSocket(manager: SfuManager | null): Socket {
  const socket = manager?.getSocket();
  if (!socket) {
    throw new ZvonokHostError("DISCONNECTED", "Join the room before using host controls");
  }
  return socket;
}

export function useHostControls(): UseHostControlsResult {
  const session = useZvonokSession();
  const manager = session.manager;

  const mutePeer = useCallback(
    async (userId: string): Promise<void> => {
      const socket = requireSocket(manager);
      await emitHostAction(socket, "sfu:mute-peer", { userId }, HOST_ACTION_TIMEOUT_MS);
    },
    [manager],
  );

  const muteAll = useCallback(async (): Promise<void> => {
    const socket = requireSocket(manager);
    await emitHostAction(socket, "sfu:mute-all", {}, HOST_ACTION_TIMEOUT_MS);
  }, [manager]);

  const lockRoom = useCallback(
    async (locked: boolean): Promise<void> => {
      const socket = requireSocket(manager);
      await emitHostAction(socket, "sfu:lock-room", { locked }, HOST_ACTION_TIMEOUT_MS);
    },
    [manager],
  );

  const kickPeer = useCallback(
    (userId: string): void => {
      manager?.kickPeer(userId);
    },
    [manager],
  );

  return { mutePeer, muteAll, lockRoom, kickPeer };
}
