import { useEffect, useRef, useState } from "react";

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
  const [mixer, setMixer] = useState<IRemoteAudioMixer | null>(null);
  const mixerRef = useRef<IRemoteAudioMixer | null>(null);
  const prevPeersRef = useRef<Map<string, string>>(new Map());

  // Manage mixer lifecycle based on enabled flag.
  // Uses mixerRef to avoid mixer state in deps, which would cause an infinite loop:
  // setMixer(instance) → mixer changes → effect re-runs → destroy → setMixer(null) → repeat.
  useEffect(() => {
    if (enabled) {
      if (!mixerRef.current) {
        const m = createMixer();
        mixerRef.current = m;
        setMixer(m);
      }
      return;
    }

    if (mixerRef.current) {
      mixerRef.current.destroy();
      mixerRef.current = null;
      setMixer(null);
      prevPeersRef.current = new Map();
    }
  }, [enabled, createMixer]);

  // Unmount cleanup only — does not call setMixer to avoid triggering re-renders.
  useEffect(() => {
    return () => {
      mixerRef.current?.destroy();
      mixerRef.current = null;
      prevPeersRef.current = new Map();
    };
  }, []);

  // Sync remote peers into the mixer.
  useEffect(() => {
    if (!enabled || !mixer) return;

    const currentTracks = new Map<string, string>();

    for (const peer of remotePeers) {
      const track = getAudioTrack(peer);
      if (!track) continue;

      currentTracks.set(peer.userId, track.id);
      const prevTrackId = prevPeersRef.current.get(peer.userId);

      if (!prevTrackId) {
        mixer.addPeer(peer.userId, track);
      } else if (prevTrackId !== track.id) {
        mixer.updatePeerTrack(peer.userId, track);
      }
    }

    for (const [userId] of prevPeersRef.current) {
      if (!currentTracks.has(userId)) {
        mixer.removePeer(userId);
      }
    }

    prevPeersRef.current = currentTracks;
  }, [remotePeers, enabled, mixer]);

  return { mixer };
}
