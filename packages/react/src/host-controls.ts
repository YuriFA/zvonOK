/**
 * Framework-free host control actions over a connected SFU manager.
 * Denials arrive as sfu:host-error on the requesting socket and reject with
 * ZvonokHostError; useHostControls wraps this factory for React consumers.
 */

import type { ISfuManager } from "@zvonok/client/sfu/interfaces";
import type { Socket } from "socket.io-client";

import { ZvonokHostError } from "./errors.js";

/** How long to wait for a denial before considering the action accepted. */
const HOST_ACTION_TIMEOUT_MS = 3000;

export interface HostControls {
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
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });

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

function requireSocket(manager: ISfuManager | null): Socket {
  const socket = manager?.getSocket?.() ?? null;
  if (!socket) {
    throw new ZvonokHostError("DISCONNECTED", "Join the room before using host controls");
  }
  return socket;
}

/**
 * Builds host control actions bound to a manager. Passing null yields
 * actions that reject with DISCONNECTED (and a no-op kick), so callers can
 * bind before a session exists.
 */
export function createHostControls(manager: ISfuManager | null): HostControls {
  return {
    async mutePeer(userId: string): Promise<void> {
      const socket = requireSocket(manager);
      await emitHostAction(socket, "sfu:mute-peer", { userId }, HOST_ACTION_TIMEOUT_MS);
    },
    async muteAll(): Promise<void> {
      const socket = requireSocket(manager);
      await emitHostAction(socket, "sfu:mute-all", {}, HOST_ACTION_TIMEOUT_MS);
    },
    async lockRoom(locked: boolean): Promise<void> {
      const socket = requireSocket(manager);
      await emitHostAction(socket, "sfu:lock-room", { locked }, HOST_ACTION_TIMEOUT_MS);
    },
    kickPeer(userId: string): void {
      manager?.kickPeer(userId);
    },
  };
}
