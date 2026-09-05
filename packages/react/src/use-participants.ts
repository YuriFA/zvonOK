/**
 * Participants hook: peer join/leave and track subscribe/unsubscribe as
 * React state, grouped per participant by media source.
 */

import type { SfuMediaSource } from "@zvonok/client/sfu/types";
import { useEffect, useMemo, useState } from "react";

import type { ZvonokParticipant } from "./types.js";
import { useZvonokSession } from "./zvonok-context.js";

export interface UseParticipantsResult {
  participants: ZvonokParticipant[];
}

type ParticipantMap = Map<string, ZvonokParticipant>;

function upsertParticipant(
  participants: ParticipantMap,
  userId: string,
  updater: (current: ZvonokParticipant) => ZvonokParticipant,
): ParticipantMap {
  const next = new Map(participants);
  const current = next.get(userId) ?? {
    userId,
    displayName: "Participant",
    cameraStream: null,
    screenStream: null,
    audioStream: null,
    isCameraEnabled: false,
    isScreenSharing: false,
    isAudioEnabled: false,
    mutedByHost: false,
  };
  next.set(userId, updater(current));
  return next;
}

function withStream(
  current: MediaStream | null,
  track: MediaStreamTrack,
  filter: (existing: MediaStreamTrack) => boolean,
): MediaStream {
  const stream = new MediaStream(current ? current.getTracks().filter(filter) : []);
  stream.addTrack(track);
  return stream;
}

function trackUpdate(
  current: ZvonokParticipant,
  track: MediaStreamTrack,
  kind: "audio" | "video",
  source?: SfuMediaSource,
): ZvonokParticipant {
  if (kind === "video" && source === "screen") {
    return {
      ...current,
      screenStream: withStream(current.screenStream, track, (existing) => existing.id !== track.id),
      isScreenSharing: true,
    };
  }
  if (kind === "video") {
    return {
      ...current,
      cameraStream: withStream(current.cameraStream, track, (existing) => existing.kind !== "video"),
      isCameraEnabled: track.enabled,
    };
  }
  return {
    ...current,
    audioStream: withStream(current.audioStream, track, (existing) => existing.kind !== "audio"),
    isAudioEnabled: track.enabled,
  };
}

/** Rebuilds a stream without the given track; null when nothing remains. */
function withoutTrack(
  current: MediaStream | null,
  filter: (existing: MediaStreamTrack) => boolean,
): MediaStream | null {
  const remaining = new MediaStream(current ? current.getTracks().filter(filter) : []);
  return remaining.getTracks().length > 0 ? remaining : null;
}

function trackEndedUpdate(
  current: ZvonokParticipant,
  track: MediaStreamTrack,
  kind: "audio" | "video",
  source?: SfuMediaSource,
): ZvonokParticipant {
  if (kind === "video" && source === "screen") {
    return {
      ...current,
      screenStream: withoutTrack(current.screenStream, (existing) => existing.id !== track.id),
      isScreenSharing: false,
    };
  }
  if (kind === "video") {
    return {
      ...current,
      cameraStream: withoutTrack(current.cameraStream, (existing) => existing.id !== track.id),
      isCameraEnabled: false,
    };
  }
  return {
    ...current,
    audioStream: withoutTrack(current.audioStream, (existing) => existing.id !== track.id),
    isAudioEnabled: false,
  };
}

export function useParticipants(): UseParticipantsResult {
  const session = useZvonokSession();
  const manager = session.manager;
  const [participants, setParticipants] = useState<ParticipantMap>(new Map());

  useEffect(() => {
    if (!manager) {
      setParticipants(new Map());
      return;
    }

    const unsubscribePeerJoined = manager.onPeerJoined((peer) => {
      setParticipants((prev) =>
        upsertParticipant(prev, peer.userId, (current) => ({
          ...current,
          displayName: peer.username || current.displayName,
        })),
      );
    });

    const unsubscribeTrack = manager.onTrack((track, kind, userId, source) => {
      setParticipants((prev) => upsertParticipant(prev, userId, (current) => trackUpdate(current, track, kind, source)));

      track.onmute = () => {
        setParticipants((prev) =>
          upsertParticipant(prev, userId, (current) => ({
            ...current,
            isCameraEnabled:
              kind === "video" && source !== "screen" ? false : current.isCameraEnabled,
            isScreenSharing:
              kind === "video" && source === "screen" ? false : current.isScreenSharing,
            isAudioEnabled: kind === "audio" ? false : current.isAudioEnabled,
          })),
        );
      };

      track.onunmute = () => {
        setParticipants((prev) =>
          upsertParticipant(prev, userId, (current) => ({
            ...current,
            isCameraEnabled:
              kind === "video" && source !== "screen" ? true : current.isCameraEnabled,
            isScreenSharing:
              kind === "video" && source === "screen" ? true : current.isScreenSharing,
            isAudioEnabled: kind === "audio" ? true : current.isAudioEnabled,
          })),
        );
      };

      track.onended = () => {
        setParticipants((prev) => {
          if (!prev.has(userId)) {
            return prev;
          }
          return upsertParticipant(prev, userId, (current) => trackEndedUpdate(current, track, kind, source));
        });
      };
    });

    const unsubscribeProducerState = manager.onProducerStateChange(({ userId, kind, paused, source }) => {
      setParticipants((prev) =>
        upsertParticipant(prev, userId, (current) => ({
          ...current,
          isCameraEnabled:
            kind === "video" && source !== "screen" ? !paused : current.isCameraEnabled,
          isAudioEnabled: kind === "audio" ? !paused : current.isAudioEnabled,
          mutedByHost: kind === "audio" && !paused ? false : current.mutedByHost,
        })),
      );
    });

    const unsubscribePeerLeft = manager.onPeerLeft((userId) => {
      setParticipants((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    });

    const unsubscribeScreenShareStopped = manager.onScreenShareStopped(({ userId }) => {
      setParticipants((prev) =>
        upsertParticipant(prev, userId, (current) => ({
          ...current,
          isScreenSharing: false,
          screenStream: null,
        })),
      );
    });

    const socket = manager.getSocket();
    let unsubscribeMutedByHost = () => {};
    if (socket) {
      const onPeerMuted = (payload: unknown) => {
        const { userId } = (payload ?? {}) as { userId?: string };
        if (!userId) {
          return;
        }
        setParticipants((prev) =>
          upsertParticipant(prev, userId, (current) => ({ ...current, mutedByHost: true })),
        );
      };
      socket.on("sfu:peer-muted", onPeerMuted);
      unsubscribeMutedByHost = () => {
        socket.off("sfu:peer-muted", onPeerMuted);
      };
    }

    return () => {
      unsubscribePeerJoined();
      unsubscribeTrack();
      unsubscribeProducerState();
      unsubscribePeerLeft();
      unsubscribeScreenShareStopped();
      unsubscribeMutedByHost();
    };
  }, [manager]);

  const list = useMemo(() => Array.from(participants.values()), [participants]);
  return { participants: list };
}

