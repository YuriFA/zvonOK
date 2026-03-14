import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/contexts/auth.context';
import { sfuManager } from '@/lib/sfu/manager';
import { mediaManager } from '@/lib/media/manager';
import type { SfuPeerInfo, SfuState } from '@/lib/sfu/types';

export interface UseMediasoupOptions {
  roomId?: string;
  roomOwnerId?: string;
  localStream: MediaStream | null;
  enabled?: boolean;
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
  toggleVideoWithHardware: (enabled: boolean) => Promise<boolean>;
  toggleAudioWithHardware: (enabled: boolean) => Promise<boolean>;
  kickPeer: (userId: string) => void;
  wasKicked: boolean;
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
    username: 'Participant',
    stream: new MediaStream(),
    isVideoEnabled: false,
    isAudioEnabled: false,
  };

  next.set(userId, updater(current));
  return next;
}

export function useMediasoup({ roomId, roomOwnerId, localStream, enabled = true }: UseMediasoupOptions): UseMediasoupResult {
  const { user } = useAuth();
  const [state, setState] = useState<SfuState>(() => sfuManager.getState());
  const [remotePeers, setRemotePeers] = useState<RemotePeerMap>(new Map());
  const [wasKicked, setWasKicked] = useState(false);

  const joinedRef = useRef(false);
  const producedKindsRef = useRef<Set<'audio' | 'video'>>(new Set());
  const guestIdentityRef = useRef({
    userId: `guest-${Math.random().toString(36).slice(2, 10)}`,
    username: 'Guest',
  });

  const identity = user
    ? { userId: user.id, username: user.username }
    : guestIdentityRef.current;

  useEffect(() => {
    if (!enabled || !roomId) {
      return;
    }

    const producedKinds = producedKindsRef.current;

    const unsubscribeState = sfuManager.onStateChange((nextState) => {
      setState(nextState);

      if (nextState.connectionState !== 'connected') {
        joinedRef.current = false;
      }
    });

    const unsubscribePeerJoined = sfuManager.onPeerJoined((peer: SfuPeerInfo) => {
      setRemotePeers((prev) =>
        updateRemotePeer(prev, peer.userId, (current) => ({
          ...current,
          username: peer.username || current.username,
        }))
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
            isVideoEnabled: kind === 'video' ? track.enabled : current.isVideoEnabled,
            isAudioEnabled: kind === 'audio' ? track.enabled : current.isAudioEnabled,
          };
        })
      );

      track.onmute = () => {
        setRemotePeers((prev) =>
          updateRemotePeer(prev, userId, (current) => ({
            ...current,
            isVideoEnabled: kind === 'video' ? false : current.isVideoEnabled,
            isAudioEnabled: kind === 'audio' ? false : current.isAudioEnabled,
          }))
        );
      };

      track.onunmute = () => {
        setRemotePeers((prev) =>
          updateRemotePeer(prev, userId, (current) => ({
            ...current,
            isVideoEnabled: kind === 'video' ? true : current.isVideoEnabled,
            isAudioEnabled: kind === 'audio' ? true : current.isAudioEnabled,
          }))
        );
      };

      track.onended = () => {
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
            isVideoEnabled: kind === 'video' ? false : current.isVideoEnabled,
            isAudioEnabled: kind === 'audio' ? false : current.isAudioEnabled,
          });

          return next;
        });
      };
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
      unsubscribePeerLeft();
      unsubscribeKicked();
      producedKinds.clear();
      joinedRef.current = false;
      setWasKicked(false);
      setRemotePeers(new Map());
      sfuManager.leaveRoom();
      sfuManager.disconnect();
    };
  }, [enabled, roomId]);

  useEffect(() => {
    if (!enabled || !roomId || state.connectionState !== 'connected' || joinedRef.current) {
      return;
    }

    joinedRef.current = true;
    const joinPayload = {
      roomId,
      userId: identity.userId,
      username: identity.username,
      ...(roomOwnerId ? { roomOwnerId } : {}),
    };

    void sfuManager.joinRoom({
      ...joinPayload,
    }).catch((error) => {
      console.error('[SFU] Failed to join room:', error);
      joinedRef.current = false;
    });
  }, [enabled, identity.userId, identity.username, roomId, roomOwnerId, state.connectionState]);

  useEffect(() => {
    if (!localStream || !state.isSendTransportCreated) {
      return;
    }

    for (const track of localStream.getTracks()) {
      if ((track.kind === 'audio' || track.kind === 'video') && !producedKindsRef.current.has(track.kind)) {
        producedKindsRef.current.add(track.kind);
        void sfuManager.produce(track).then((producer) => {
          if (!producer) {
            producedKindsRef.current.delete(track.kind as 'audio' | 'video');
          }
        }).catch((error) => {
          console.error('[SFU] Failed to produce track:', track.kind, error);
          producedKindsRef.current.delete(track.kind as 'audio' | 'video');
        });
      }
    }
  }, [localStream, state.isSendTransportCreated]);

  /**
   * Toggle video with proper hardware control.
   * When disabled: stops the camera track (releases hardware, indicator light turns off).
   * When enabled: re-acquires the camera track and replaces it in the SFU producer.
   * Returns true on success, false on failure.
   */
  const toggleVideoWithHardware = useCallback(async (enabled: boolean): Promise<boolean> => {
    if (enabled) {
      const newTrack = await mediaManager.startVideoTrack();
      if (!newTrack) {
        return false;
      }

      const producer = sfuManager.getProducerByKind('video');
      if (!producer) {
        const nextProducer = await sfuManager.produce(newTrack);
        if (!nextProducer) {
          mediaManager.stopVideoTrack('Failed to publish camera');
          return false;
        }

        return true;
      }

      const replaced = await sfuManager.replaceTrack('video', newTrack);
      if (!replaced) {
        console.error('[useMediasoup] Failed to replace video track in SFU');
        mediaManager.stopVideoTrack('Failed to publish camera');
        return false;
      }

      sfuManager.resumeProducer(producer.id);

      return true;
    } else {
      const producer = sfuManager.getProducerByKind('video');
      if (producer) {
        sfuManager.pauseProducer(producer.id);
      }

      const replaced = await sfuManager.replaceTrack('video', null);
      if (!replaced) {
        console.warn('[useMediasoup] Failed to detach video track from SFU producer; producer remains paused');
      }

      mediaManager.stopVideoTrack();

      return true;
    }
  }, []);

  /**
   * Toggle audio with proper hardware control.
   * When disabled: stops the microphone track (releases hardware, system indicator turns off).
   * When enabled: re-acquires the microphone track and replaces it in the SFU producer.
   * Returns true on success, false on failure.
   */
  const toggleAudioWithHardware = useCallback(async (enabled: boolean): Promise<boolean> => {
    if (enabled) {
      const newTrack = await mediaManager.startAudioTrack();
      if (!newTrack) {
        return false;
      }

      const producer = sfuManager.getProducerByKind('audio');
      if (!producer) {
        const nextProducer = await sfuManager.produce(newTrack);
        if (!nextProducer) {
          mediaManager.stopAudioTrack('Failed to publish microphone');
          return false;
        }

        return true;
      }

      const replaced = await sfuManager.replaceTrack('audio', newTrack);
      if (!replaced) {
        console.error('[useMediasoup] Failed to replace audio track in SFU');
        mediaManager.stopAudioTrack('Failed to publish microphone');
        return false;
      }

      sfuManager.resumeProducer(producer.id);

      return true;
    } else {
      const producer = sfuManager.getProducerByKind('audio');
      if (producer) {
        sfuManager.pauseProducer(producer.id);
      }

      const replaced = await sfuManager.replaceTrack('audio', null);
      if (!replaced) {
        console.warn('[useMediasoup] Failed to detach audio track from SFU producer; producer remains paused');
      }

      mediaManager.stopAudioTrack();

      return true;
    }
  }, []);

  const kickPeer = useCallback((userId: string) => {
    sfuManager.kickPeer(userId);
  }, []);

  return {
    state,
    remotePeers: useMemo(() => Array.from(remotePeers.values()), [remotePeers]),
    toggleVideoWithHardware,
    toggleAudioWithHardware,
    kickPeer,
    wasKicked,
  };
}

