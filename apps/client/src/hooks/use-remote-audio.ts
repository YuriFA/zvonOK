import { useEffect, useRef } from "react";

import type { RemotePeerMedia } from "@/hooks/use-mediasoup";
import type { IRemoteAudioMixer } from "@/lib/audio/remote-audio-mixer";

interface UseRemoteAudioOptions {
  remotePeers: RemotePeerMedia[];
  enabled?: boolean;
}

interface UseRemoteAudioReturn {
  mixer: IRemoteAudioMixer | null;
}

function getAudioTrack(peer: RemotePeerMedia): MediaStreamTrack | null {
  const tracks = peer.audioStream.getAudioTracks();
  return tracks[0] ?? null;
}

export function useRemoteAudio(
  createMixer: () => IRemoteAudioMixer,
  { remotePeers, enabled = true }: UseRemoteAudioOptions,
): UseRemoteAudioReturn {
  const mixerRef = useRef<IRemoteAudioMixer | null>(null);
  const prevPeersRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (enabled) {
      if (!mixerRef.current) {
        mixerRef.current = createMixer();
      }
      return;
    }

    if (mixerRef.current) {
      mixerRef.current.destroy();
      mixerRef.current = null;
      prevPeersRef.current = new Map();
    }
  }, [enabled, createMixer]);

  useEffect(() => {
    if (!enabled || !mixerRef.current) return;

    const currentTracks = new Map<string, string>();

    for (const peer of remotePeers) {
      const track = getAudioTrack(peer);
      if (!track) continue;

      currentTracks.set(peer.userId, track.id);
      const prevTrackId = prevPeersRef.current.get(peer.userId);

      if (!prevTrackId) {
        mixerRef.current.addPeer(peer.userId, track);
      } else if (prevTrackId !== track.id) {
        mixerRef.current.updatePeerTrack(peer.userId, track);
      }
    }

    for (const [userId] of prevPeersRef.current) {
      if (!currentTracks.has(userId)) {
        mixerRef.current?.removePeer(userId);
      }
    }

    prevPeersRef.current = currentTracks;
  }, [remotePeers, enabled, createMixer]);

  useEffect(() => {
    return () => {
      mixerRef.current?.destroy();
      mixerRef.current = null;
      prevPeersRef.current = new Map();
    };
  }, []);

  return { mixer: mixerRef.current };
}
