/**
 * Join lifecycle hook: connection, join with room slug + room token, and
 * publish controls passed through to the underlying SfuManager.
 */

import type { Socket } from "socket.io-client";
import { SfuConnection } from "@zvonok/client/sfu/connection";
import { SfuManager } from "@zvonok/client/sfu/manager";
import { useCallback, useEffect, useRef, useState } from "react";

import { ZvonokError, ZvonokJoinError } from "./errors.js";
import type { ZvonokStatus } from "./types.js";
import { useZvonokSession } from "./zvonok-context.js";

const CONNECTION_TIMEOUT_MS = 10_000;
const JOIN_TIMEOUT_MS = 10_000;

export interface UseZvonokConnectionOptions {
  /** Room slug to join. */
  roomSlug: string;
  /** Room token minted by the server; the server derives identity from it. */
  token: string;
}

export interface UseZvonokConnectionResult {
  status: ZvonokStatus;
  error: Error | null;
  join(): Promise<void>;
  leave(): void;
  /** Live SfuManager instance; null until the first join. Escape hatch for advanced consumers. */
  manager: SfuManager | null;
  /** True when the room is locked by the host. */
  isRoomLocked: boolean;
  /** True after the server removed this peer from the room. */
  wasKicked: boolean;
  produceTrack(track: MediaStreamTrack): Promise<boolean>;
  pauseProducer(kind: "audio" | "video"): void;
  resumeProducer(kind: "audio" | "video"): void;
  closeProducer(kind: "audio" | "video"): void;
  replaceTrack(kind: "audio" | "video", track: MediaStreamTrack | null): Promise<boolean>;
  hasProducer(kind: "audio" | "video"): boolean;
}

/**
 * Extracts a display identity from the room token payload. Presentation only:
 * the server derives the authoritative identity from the verified claims.
 */
function identityFromToken(token: string): { userId: string; username: string } {
  const fallback = `guest-${Math.random().toString(36).slice(2, 10)}`;
  try {
    const segment = token.split(".")[1];
    if (!segment) {
      return { userId: fallback, username: "Participant" };
    }
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { participantId?: string };
    return { userId: payload.participantId ?? fallback, username: "Participant" };
  } catch {
    return { userId: fallback, username: "Participant" };
  }
}

function toZvonokError(error: unknown, fallbackCode: string): ZvonokError {
  if (error instanceof ZvonokError) {
    return error;
  }
  return new ZvonokError(
    fallbackCode,
    error instanceof Error ? error.message : "Failed to join the room",
  );
}

function waitForConnectionState(manager: SfuManager, timeoutMs: number): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  if (manager.getState().connectionState === "connected") {
    resolve();
    return promise;
  }

  let unsubscribe: () => void;
  const settle = (error: ZvonokError | null) => {
    clearTimeout(timer);
    unsubscribe();
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  };
  const timer = setTimeout(() => {
    settle(new ZvonokError("CONNECTION_FAILED", "Timed out connecting to the Zvonok server"));
  }, timeoutMs);
  unsubscribe = manager.onStateChange((state) => {
    if (state.connectionState === "connected") {
      settle(null);
    } else if (state.connectionState === "failed") {
      settle(new ZvonokError("CONNECTION_FAILED", "Could not connect to the Zvonok server"));
    }
  });
  return promise;
}

/**
 * Subscribes to the join ack immediately, closing any window where an ack
 * could be missed; `send` sends the join request once connected.
 */
function createJoinAckWaiter(
  socket: Socket,
  timeoutMs: number,
  emitJoin: () => void,
): { promise: Promise<void>; send: () => void } {
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cleanup = () => {
    clearTimeout(timer);
    socket.off("sfu:joined", onJoined);
    socket.off("sfu:join-error", onJoinError);
  };
  const onJoined = () => {
    cleanup();
    resolve();
  };
  const onJoinError = (payload: unknown) => {
    const { code, message } = (payload ?? {}) as { code?: string; message?: string };
    cleanup();
    reject(new ZvonokJoinError(code ?? "JOIN_FAILED", message ?? "The server rejected the join"));
  };
  socket.on("sfu:joined", onJoined);
  socket.on("sfu:join-error", onJoinError);
  return {
    promise,
    send: () => {
      timer = setTimeout(() => {
        cleanup();
        reject(new ZvonokJoinError("JOIN_TIMEOUT", "The server did not confirm the join"));
      }, timeoutMs);
      emitJoin();
    },
  };
}

export function useZvonokConnection({ roomSlug, token }: UseZvonokConnectionOptions): UseZvonokConnectionResult {
  const session = useZvonokSession();
  const managerRef = useRef<SfuManager | null>(null);
  const joinPromiseRef = useRef<Promise<void> | null>(null);
  const detachRoomListenersRef = useRef<(() => void) | null>(null);
  const [wasKicked, setWasKicked] = useState(false);

  const ensureManager = useCallback((): SfuManager => {
    if (managerRef.current) {
      return managerRef.current;
    }
    const manager = new SfuManager(new SfuConnection(session.serverUrl));
    managerRef.current = manager;
    session.update({ manager });
    return manager;
  }, [session]);

  const leave = useCallback(() => {
    detachRoomListenersRef.current?.();
    detachRoomListenersRef.current = null;
    const manager = managerRef.current;
    if (manager) {
      manager.leaveRoom();
      manager.disconnect();
    }
    managerRef.current = null;
    joinPromiseRef.current = null;
    setWasKicked(false);
    session.update({ manager: null, status: "disconnected", error: null, locked: false });
  }, [session]);

  const join = useCallback((): Promise<void> => {
    if (joinPromiseRef.current) {
      return joinPromiseRef.current;
    }
    const attempt = (async () => {
      const manager = ensureManager();
      session.update({ status: "connecting", error: null });
      manager.connect();

      const socket = manager.getSocket();
      if (socket) {
        const onRoomLocked = (payload: unknown) => {
          const { locked } = (payload ?? {}) as { locked?: boolean };
          session.update({ locked: locked === true });
        };
        socket.on("sfu:room-locked", onRoomLocked);
        detachRoomListenersRef.current = () => {
          socket.off("sfu:room-locked", onRoomLocked);
        };
      }

      // Subscribe to the ack before awaiting the connection so no ack or
      // denial can slip through unnoticed.
      const { userId, username } = identityFromToken(token);
      const ack = createJoinAckWaiter(
        manager.getSocket() as Socket,
        JOIN_TIMEOUT_MS,
        () => {
          void manager.joinRoom({ roomId: roomSlug, roomSlug, userId, username, token });
        },
      );

      await waitForConnectionState(manager, CONNECTION_TIMEOUT_MS);
      ack.send();
      await ack.promise;
      session.update({ status: "joined" });
    })().catch((error: unknown) => {
      const typedError = toZvonokError(error, "JOIN_FAILED");
      session.update({ status: "error", error: typedError });
      throw typedError;
    });
    joinPromiseRef.current = attempt.finally(() => {
      joinPromiseRef.current = null;
    });
    return joinPromiseRef.current;
  }, [ensureManager, roomSlug, session, token]);

  // A kicked peer loses its room membership; reflect it in the status.
  useEffect(() => {
    const manager = session.manager;
    if (!manager) {
      return;
    }
    const offKicked = manager.onKicked(() => {
      setWasKicked(true);
      session.update({ status: "disconnected", locked: false });
    });
    return () => {
      offKicked();
    };
  }, [session.manager, session]);

  // Disconnect when the owning component unmounts.
  const leaveRef = useRef(leave);
  useEffect(() => {
    leaveRef.current = leave;
  }, [leave]);
  useEffect(
    () => () => {
      leaveRef.current();
    },
    [],
  );

  const requireManager = useCallback((): SfuManager => {
    const manager = managerRef.current;
    if (!manager) {
      throw new ZvonokError("DISCONNECTED", "Join the room before using publish controls");
    }
    return manager;
  }, []);

  const produceTrack = useCallback(
    async (track: MediaStreamTrack): Promise<boolean> => {
      const producer = await requireManager().produce(track);
      return producer !== null;
    },
    [requireManager],
  );

  const pauseProducer = useCallback(
    (kind: "audio" | "video"): void => {
      const manager = requireManager();
      const producer = manager.getProducerByKind(kind);
      if (producer) {
        manager.pauseProducer(producer.id);
      }
    },
    [requireManager],
  );

  const resumeProducer = useCallback(
    (kind: "audio" | "video"): void => {
      const manager = requireManager();
      const producer = manager.getProducerByKind(kind);
      if (producer) {
        manager.resumeProducer(producer.id);
      }
    },
    [requireManager],
  );

  const closeProducer = useCallback(
    (kind: "audio" | "video"): void => {
      requireManager().closeProducer(kind);
    },
    [requireManager],
  );

  const replaceTrack = useCallback(
    (kind: "audio" | "video", track: MediaStreamTrack | null): Promise<boolean> => {
      return requireManager().replaceTrack(kind, track);
    },
    [requireManager],
  );

  const hasProducer = useCallback(
    (kind: "audio" | "video"): boolean => {
      return managerRef.current?.getProducerByKind(kind) !== undefined;
    },
    [],
  );

  return {
    status: session.status,
    error: session.error,
    join,
    leave,
    manager: session.manager,
    isRoomLocked: session.locked,
    wasKicked,
    produceTrack,
    pauseProducer,
    resumeProducer,
    closeProducer,
    replaceTrack,
    hasProducer,
  };
}
