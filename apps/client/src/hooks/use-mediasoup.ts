/**
 * Mediasoup hook for SFU integration.
 * Uses dependency injection via SfuManagerContext.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/features/auth/contexts/auth.context";
import { useSfuManager } from "@/features/sfu/contexts/sfu-manager.context";
import type { SfuPeerInfo, SfuState } from "@/lib/sfu/types";

export interface UseMediasoupOptions {
  roomId?: string;
  roomOwnerId?: string;
  localVideoStream: MediaStream | null;
  localAudioStream: MediaStream | null;
  enabled?: boolean;
  displayName?: string;
}

export interface RemotePeerMedia {
  userId: string;
  username: string;
  stream: MediaStream;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

export interface UseMediasoupResult {
  state: SfuState;
  remotePeers: RemotePeerMedia[];
  kickPeer: (userId: string) => void;
  wasKicked: boolean;
  produceTrack: (track: MediaStreamTrack) => Promise<boolean>;
  pauseProducer: (kind: "audio" | "video") => void;
  resumeProducer: (kind: "audio" | "video") => void;
  replaceTrack: (kind: "audio" | "video", track: MediaStreamTrack | null) => Promise<boolean>;
  hasProducer: (kind: "audio" | "video") => boolean;
}

type RemotePeerMap = Map<string, RemotePeerMedia>;

function updateRemotePeer(
  peers: RemotePeerMap,
  userId: string,
  updater: (peer: RemotePeerMedia) => RemotePeerMedia,
): RemotePeerMap {
  const next = new Map(peers);
  const current = next.get(userId) ?? {
    userId,
    username: "Participant",
    stream: new MediaStream(),
    isVideoEnabled: false,
    isAudioEnabled: false,
  };

  next.set(userId, updater(current));
  return next;
}

export function useMediasoup({
  roomId,
  roomOwnerId,
  localVideoStream,
  localAudioStream,
  enabled = true,
  displayName,
}: UseMediasoupOptions): UseMediasoupResult {
  const { user } = useAuth();
  const sfuManager = useSfuManager();
  const [state, setState] = useState<SfuState>(() => sfuManager.getState());
  const [remotePeers, setRemotePeers] = useState<RemotePeerMap>(new Map());
  const [wasKicked, setWasKicked] = useState(false);

  const joinedRef = useRef(false);
  const producedKindsRef = useRef<Set<"audio" | "video">>(new Set());
  const guestUserIdRef = useRef(`guest-${Math.random().toString(36).slice(2, 10)}`);

  const identity = {
    userId: user?.id ?? guestUserIdRef.current,
    username: displayName ?? "Guest",
  };

  useEffect(() => {
    if (!roomId || !enabled) {
      return;
    }

    // Snapshot the Set object at effect setup time. Using the snapshot (rather
    // than producedKindsRef.current) in callbacks and cleanup avoids the
    // exhaustive-deps lint warning about accessing .current inside cleanup.
    // The snapshot is safe because we only call .clear() — never reassign the ref.
    const producedKinds = producedKindsRef.current;

    const unsubscribeState = sfuManager.onStateChange((nextState) => {
      setState(nextState);

      if (nextState.connectionState !== "connected") {
        joinedRef.current = false;
        producedKinds.clear();
      }
    });

    const unsubscribePeerJoined = sfuManager.onPeerJoined((peer: SfuPeerInfo) => {
      setRemotePeers((prev) =>
        updateRemotePeer(prev, peer.userId, (current) => ({
          ...current,
          username: peer.username || current.username,
        })),
      );
    });

    const unsubscribeTrack = sfuManager.onTrack((track, kind, userId) => {
      setRemotePeers((prev) =>
        updateRemotePeer(prev, userId, (current) => {
          const stream = new MediaStream(
            current.stream.getTracks().filter((existingTrack) => existingTrack.kind !== kind),
          );
          stream.addTrack(track);

          return {
            ...current,
            stream,
            isVideoEnabled: kind === "video" ? track.enabled : current.isVideoEnabled,
            isAudioEnabled: kind === "audio" ? track.enabled : current.isAudioEnabled,
          };
        }),
      );

      track.onmute = () => {
        console.log(`[SFU] Track muted: ${kind} from user ${userId}`);
        setRemotePeers((prev) =>
          updateRemotePeer(prev, userId, (current) => ({
            ...current,
            isVideoEnabled: kind === "video" ? false : current.isVideoEnabled,
            isAudioEnabled: kind === "audio" ? false : current.isAudioEnabled,
          })),
        );
      };

      track.onunmute = () => {
        console.log(`[SFU] Track unmuted: ${kind} from user ${userId}`);
        setRemotePeers((prev) =>
          updateRemotePeer(prev, userId, (current) => ({
            ...current,
            isVideoEnabled: kind === "video" ? true : current.isVideoEnabled,
            isAudioEnabled: kind === "audio" ? true : current.isAudioEnabled,
          })),
        );
      };

      track.onended = () => {
        console.log(`[SFU] Track ended: ${kind} from user ${userId}`);
        setRemotePeers((prev) => {
          const next = new Map(prev);
          const current = next.get(userId);
          if (!current) {
            return prev;
          }

          const stream = new MediaStream(
            current.stream.getTracks().filter((existingTrack) => existingTrack.id !== track.id),
          );

          next.set(userId, {
            ...current,
            stream,
            isVideoEnabled: kind === "video" ? false : current.isVideoEnabled,
            isAudioEnabled: kind === "audio" ? false : current.isAudioEnabled,
          });

          return next;
        });
      };
    });

    const unsubscribeProducerState = sfuManager.onProducerStateChange((payload) => {
      const { userId, kind, paused } = payload;
      setRemotePeers((prev) =>
        updateRemotePeer(prev, userId, (current) => ({
          ...current,
          isVideoEnabled: kind === "video" ? !paused : current.isVideoEnabled,
          isAudioEnabled: kind === "audio" ? !paused : current.isAudioEnabled,
        })),
      );
    });

    const unsubscribePeerLeft = sfuManager.onPeerLeft((userId) => {
      setRemotePeers((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    });

    const unsubscribeKicked = sfuManager.onKicked(() => {
      joinedRef.current = false;
      setWasKicked(true);
      setRemotePeers(new Map());
    });

    sfuManager.connect();

    return () => {
      unsubscribeState();
      unsubscribePeerJoined();
      unsubscribeTrack();
      unsubscribeProducerState();
      unsubscribePeerLeft();
      unsubscribeKicked();
      producedKinds.clear();
      joinedRef.current = false;
      setWasKicked(false);
      setRemotePeers(new Map());
      sfuManager.leaveRoom();
      sfuManager.disconnect();
    };
  }, [roomId, enabled, sfuManager]);

  useEffect(() => {
    if (!roomId || !enabled || state.connectionState !== "connected" || joinedRef.current) {
      return;
    }

    joinedRef.current = true;
    const joinPayload = {
      roomId,
      userId: identity.userId,
      username: identity.username,
      ...(roomOwnerId ? { roomOwnerId } : {}),
    };

    void sfuManager.joinRoom({ ...joinPayload }).catch((error) => {
      console.error("[SFU] Failed to join room:", error);
      joinedRef.current = false;
    });
  }, [
    enabled,
    identity.userId,
    identity.username,
    roomId,
    roomOwnerId,
    state.connectionState,
    sfuManager,
  ]);

  useEffect(() => {
    if (!state.isSendTransportCreated) {
      return;
    }

    const streams = [localVideoStream, localAudioStream];

    for (const stream of streams) {
      if (!stream) continue;
      stream.getTracks().forEach((track) => {
        if (
          (track.kind === "audio" || track.kind === "video") &&
          track.readyState !== "ended" &&
          !producedKindsRef.current.has(track.kind)
        ) {
          producedKindsRef.current.add(track.kind);
          sfuManager
            .produce(track)
            .then((producer) => {
              if (!producer) {
                producedKindsRef.current.delete(track.kind as "audio" | "video");
              }
            })
            .catch((error) => {
              console.error("[SFU] Failed to produce track:", track.kind, error);
              producedKindsRef.current.delete(track.kind as "audio" | "video");
            });
        }
      });
    }
  }, [localVideoStream, localAudioStream, state.isSendTransportCreated, sfuManager]);

  const kickPeer = useCallback(
    (userId: string) => {
      sfuManager.kickPeer(userId);
    },
    [sfuManager],
  );

  const produceTrack = useCallback(
    async (track: MediaStreamTrack): Promise<boolean> => {
      const kind = track.kind as "audio" | "video";
      producedKindsRef.current.add(kind);
      const producer = await sfuManager.produce(track);
      if (!producer) {
        producedKindsRef.current.delete(kind);
      }
      return producer !== null;
    },
    [sfuManager],
  );

  const pauseProducer = useCallback(
    (kind: "audio" | "video") => {
      const producer = sfuManager.getProducerByKind(kind);
      if (producer) {
        sfuManager.pauseProducer(producer.id);
      }
    },
    [sfuManager],
  );

  const resumeProducer = useCallback(
    (kind: "audio" | "video") => {
      const producer = sfuManager.getProducerByKind(kind);
      if (producer) {
        sfuManager.resumeProducer(producer.id);
      }
    },
    [sfuManager],
  );

  const replaceTrack = useCallback(
    async (kind: "audio" | "video", track: MediaStreamTrack | null): Promise<boolean> => {
      return sfuManager.replaceTrack(kind, track);
    },
    [sfuManager],
  );

  const hasProducer = useCallback(
    (kind: "audio" | "video"): boolean => {
      return sfuManager.getProducerByKind(kind) !== undefined;
    },
    [sfuManager],
  );

  return {
    state,
    remotePeers: useMemo(() => Array.from(remotePeers.values()), [remotePeers]),
    kickPeer,
    wasKicked,
    produceTrack,
    pauseProducer,
    resumeProducer,
    replaceTrack,
    hasProducer,
  };
}
