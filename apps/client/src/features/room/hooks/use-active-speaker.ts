import { useCallback, useEffect, useRef, useState } from 'react';
import type { RemotePeerMedia } from '@/hooks/use-mediasoup';

interface OwnedAudioAnalyser {
  type: 'owned';
  context: AudioContext;
  analyser: AnalyserNode;
  source: MediaStreamAudioSourceNode;
}

interface BorrowedAudioAnalyser {
  type: 'borrowed';
  analyser: AnalyserNode;
}

type PeerAnalyser = OwnedAudioAnalyser | BorrowedAudioAnalyser;

interface UseActiveSpeakerOptions {
  remotePeers: RemotePeerMedia[];
  localUserId?: string;
  localAudioStream: MediaStream | null;
  enabled?: boolean;
  sampleInterval?: number;
  speakingThreshold?: number;
  holdTime?: number;
  switchMargin?: number;
  getRemoteAnalyser?: (userId: string) => AnalyserNode | undefined;
}

interface SpeakerState {
  activeSpeakerId: string | null;
  speakerSince: number;
  speakerLevel: number;
  /** Timestamp when silence started; 0 means no silence yet */
  silenceSince: number;
}

/**
 * Hook for detecting the active speaker in a group call.
 * Uses Web Audio API to analyze audio levels and implements
 * hysteresis to prevent rapid speaker switching.
 */
export function useActiveSpeaker({
  remotePeers,
  localUserId,
  localAudioStream,
  enabled = true,
  sampleInterval = 200,
  speakingThreshold = 0.003,
  holdTime = 800,
  switchMargin = 1.3,
  getRemoteAnalyser,
}: UseActiveSpeakerOptions): string | null {
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);

  const analysersRef = useRef<Map<string, PeerAnalyser>>(new Map());
  const speakerStateRef = useRef<SpeakerState>({
    activeSpeakerId: null,
    speakerSince: 0,
    speakerLevel: 0,
    silenceSince: 0,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const smoothedLevelsRef = useRef<Map<string, number>>(new Map());

  // Calculate RMS level from analyser data
  const calculateLevel = useCallback((analyser: AnalyserNode): number => {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(dataArray);

    // Calculate RMS (Root Mean Square)
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / dataArray.length);
  }, []);

  const createAnalyser = useCallback((stream: MediaStream): OwnedAudioAnalyser | null => {
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      return null;
    }

    try {
      const context = new AudioContext();
      void context.resume();
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;

      const source = context.createMediaStreamSource(stream);
      source.connect(analyser);

      const silentGain = context.createGain();
      silentGain.gain.value = 0;
      analyser.connect(silentGain);
      silentGain.connect(context.destination);

      return { type: 'owned', context, analyser, source };
    } catch (error) {
      console.error('[ActiveSpeaker] Failed to create analyser:', error);
      return null;
    }
  }, []);

  const cleanupAnalyser = useCallback((entry: PeerAnalyser) => {
    if (entry.type !== 'owned') return;
    try {
      entry.source.disconnect();
      void entry.context.close();
    } catch {
      // Ignore cleanup errors
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      for (const analyser of analysersRef.current.values()) {
        cleanupAnalyser(analyser);
      }
      analysersRef.current.clear();
      smoothedLevelsRef.current.clear();
      return;
    }

    const currentIds = new Set<string>();

    if (localAudioStream && localUserId) {
      currentIds.add(localUserId);
      if (!analysersRef.current.has(localUserId)) {
        const analyser = createAnalyser(localAudioStream);
        if (analyser) {
          analysersRef.current.set(localUserId, analyser);
        }
      }
    }

    for (const peer of remotePeers) {
      if (!peer.isAudioEnabled) {
        continue;
      }

      currentIds.add(peer.userId);

      if (getRemoteAnalyser) {
        const existing = analysersRef.current.get(peer.userId);
        if (!existing || existing.type !== 'borrowed') {
          if (existing) {
            cleanupAnalyser(existing);
            analysersRef.current.delete(peer.userId);
          }
          const analyser = getRemoteAnalyser(peer.userId);
          if (analyser) {
            analysersRef.current.set(peer.userId, { type: 'borrowed', analyser });
          }
        }
      } else if (!analysersRef.current.has(peer.userId)) {
        const analyser = createAnalyser(peer.stream);
        if (analyser) {
          analysersRef.current.set(peer.userId, analyser);
        }
      }
    }

    for (const [id, analyser] of analysersRef.current) {
      if (!currentIds.has(id)) {
        cleanupAnalyser(analyser);
        analysersRef.current.delete(id);
        smoothedLevelsRef.current.delete(id);
      }
    }
  }, [enabled, localAudioStream, localUserId, remotePeers, createAnalyser, cleanupAnalyser, getRemoteAnalyser]);

  // Main detection loop
  useEffect(() => {
    if (!enabled) {
      setActiveSpeakerId(null);
      speakerStateRef.current = {
        activeSpeakerId: null,
        speakerSince: 0,
        speakerLevel: 0,
        silenceSince: 0,
      };
      return;
    }

    const smoothFactor = 0.3; // Lower = smoother

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const levels = new Map<string, number>();

      // Collect levels from all participants
      for (const [id, entry] of analysersRef.current) {
        const rawLevel = calculateLevel(entry.analyser);

        // Apply smoothing
        const prevSmoothed = smoothedLevelsRef.current.get(id) ?? 0;
        const smoothed = prevSmoothed + smoothFactor * (rawLevel - prevSmoothed);
        smoothedLevelsRef.current.set(id, smoothed);

        if (smoothed >= speakingThreshold) {
          levels.set(id, smoothed);
        }
      }

      // Find the loudest speaker above threshold
      let loudestId: string | null = null;
      let loudestLevel = 0;

      for (const [id, level] of levels) {
        if (level > loudestLevel) {
          loudestLevel = level;
          loudestId = id;
        }
      }

      const state = speakerStateRef.current;

      // No one is speaking
      if (!loudestId) {
        if (state.activeSpeakerId) {
          if (state.silenceSince === 0) {
            // Start the silence timer
            speakerStateRef.current = { ...state, silenceSince: now };
          } else if (now - state.silenceSince > holdTime) {
            // Hold time elapsed since silence started — clear active speaker
            speakerStateRef.current = { activeSpeakerId: null, speakerSince: 0, speakerLevel: 0, silenceSince: 0 };
            setActiveSpeakerId(null);
          }
        }
        return;
      }

      // First speaker or same speaker getting louder
      if (!state.activeSpeakerId || loudestId === state.activeSpeakerId) {
        if (loudestId !== state.activeSpeakerId) {
          speakerStateRef.current = {
            activeSpeakerId: loudestId,
            speakerSince: now,
            speakerLevel: loudestLevel,
            silenceSince: 0,
          };
          setActiveSpeakerId(loudestId);
        } else {
          // Update level for current speaker and reset silence timer
          speakerStateRef.current.speakerLevel = loudestLevel;
          speakerStateRef.current.silenceSince = 0;
        }
        return;
      }

      // Different speaker - check if we should switch
      const timeSinceLastSwitch = now - state.speakerSince;

      // Only switch if hold time has passed
      if (timeSinceLastSwitch < holdTime) {
        return;
      }

      // Switch if new speaker is significantly louder
      if (loudestLevel > state.speakerLevel * switchMargin) {
        speakerStateRef.current = {
          activeSpeakerId: loudestId,
          speakerSince: now,
          speakerLevel: loudestLevel,
          silenceSince: 0,
        };
        setActiveSpeakerId(loudestId);
      }
    }, sampleInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, sampleInterval, speakingThreshold, holdTime, switchMargin, calculateLevel]);

  // Cleanup all analysers on unmount
  useEffect(() => {
    const analysers = analysersRef.current;
    const smoothedLevels = smoothedLevelsRef.current;

    return () => {
      for (const analyser of analysers.values()) {
        cleanupAnalyser(analyser);
      }
      analysers.clear();
      smoothedLevels.clear();
    };
  }, [cleanupAnalyser]);

  return activeSpeakerId;
}
