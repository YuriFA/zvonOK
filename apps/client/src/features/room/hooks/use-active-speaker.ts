import { useCallback, useEffect, useRef, useState } from 'react';
import type { RemotePeerMedia } from '@/hooks/use-mediasoup';

interface AudioAnalyser {
  context: AudioContext;
  analyser: AnalyserNode;
  source: MediaStreamAudioSourceNode;
}

interface UseActiveSpeakerOptions {
  remotePeers: RemotePeerMedia[];
  localUserId?: string;
  localStream: MediaStream | null;
  enabled?: boolean;
  /** Sample interval in ms (default: 200ms) */
  sampleInterval?: number;
  /** Minimum RMS level to consider as speaking (0-1, default: 0.01) */
  speakingThreshold?: number;
  /** Time in ms to hold speaker before switching (default: 800ms) */
  holdTime?: number;
  /** How much louder next speaker must be to switch (default: 1.3x) */
  switchMargin?: number;
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
  localStream,
  enabled = true,
  sampleInterval = 200,
  speakingThreshold = 0.01,
  holdTime = 800,
  switchMargin = 1.3,
}: UseActiveSpeakerOptions): string | null {
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);

  // Store analysers for each participant
  const analysersRef = useRef<Map<string, AudioAnalyser>>(new Map());
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

  // Create analyser for a stream
  const createAnalyser = useCallback((stream: MediaStream): AudioAnalyser | null => {
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      return null;
    }

    try {
      const context = new AudioContext();
      void context.resume(); // Ensure context is running (may start suspended without user gesture)
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;

      const source = context.createMediaStreamSource(stream);
      source.connect(analyser);

      // Route silent audio to destination to keep the graph active.
      // Required when the same stream is also consumed by WebRTC (e.g. local getUserMedia),
      // otherwise some browsers won't process the audio graph.
      const silentGain = context.createGain();
      silentGain.gain.value = 0;
      analyser.connect(silentGain);
      silentGain.connect(context.destination);

      return { context, analyser, source };
    } catch (error) {
      console.error('[ActiveSpeaker] Failed to create analyser:', error);
      return null;
    }
  }, []);

  // Cleanup analyser
  const cleanupAnalyser = useCallback((analyser: AudioAnalyser) => {
    try {
      analyser.source.disconnect();
      void analyser.context.close();
    } catch {
      // Ignore cleanup errors
    }
  }, []);

  // Update analysers when peers change
  useEffect(() => {
    if (!enabled) {
      // Clean up all analysers so they are recreated fresh on next enable
      for (const analyser of analysersRef.current.values()) {
        cleanupAnalyser(analyser);
      }
      analysersRef.current.clear();
      smoothedLevelsRef.current.clear();
      return;
    }

    const currentIds = new Set<string>();

    // Add local user analyser
    if (localStream && localUserId) {
      currentIds.add(localUserId);
      if (!analysersRef.current.has(localUserId)) {
        const analyser = createAnalyser(localStream);
        if (analyser) {
          analysersRef.current.set(localUserId, analyser);
        }
      }
    }

    // Add remote peer analysers
    for (const peer of remotePeers) {
      // Skip peers with muted audio
      if (!peer.isAudioEnabled) {
        continue;
      }

      currentIds.add(peer.userId);
      if (!analysersRef.current.has(peer.userId)) {
        const analyser = createAnalyser(peer.stream);
        if (analyser) {
          analysersRef.current.set(peer.userId, analyser);
        }
      }
    }

    // Remove analysers for peers that left or muted
    for (const [id, analyser] of analysersRef.current) {
      if (!currentIds.has(id)) {
        cleanupAnalyser(analyser);
        analysersRef.current.delete(id);
        smoothedLevelsRef.current.delete(id);
      }
    }
  }, [enabled, localStream, localUserId, remotePeers, createAnalyser, cleanupAnalyser]);

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
      for (const [id, { analyser }] of analysersRef.current) {
        const rawLevel = calculateLevel(analyser);

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
