import { useRemoteAudio } from '@/hooks/use-remote-audio';
import { ActiveSpeakerDetector } from '@/lib/audio/active-speaker-detector';
import { AudioLevelSampler } from '@/lib/audio/audio-level-sampler';
import { RemoteAudioMixer, type IRemoteAudioMixer } from '@/lib/audio/remote-audio-mixer';
import { RoomAudioStore } from './room-audio.store';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type { UseRoomSessionResult } from '../hooks/use-room-session';

export interface RoomAudioContextValue {
  mixer: IRemoteAudioMixer | null;
  audioElement: HTMLAudioElement | null;
  store: RoomAudioStore;
}

const RoomAudioContext = createContext<RoomAudioContextValue | null>(null);

const createMixer = () => new RemoteAudioMixer();

interface Props {
  session: UseRoomSessionResult;
  children: ReactNode;
}

export function RoomAudioContextProvider({ children, session }: Props) {
  const samplerRef = useRef<AudioLevelSampler>(new AudioLevelSampler());
  const detectorRef = useRef<ActiveSpeakerDetector>(new ActiveSpeakerDetector());
  const storeRef = useRef<RoomAudioStore>(new RoomAudioStore());
  const tickCountRef = useRef(0);
  const isConnected = session.sfuState.connectionState === 'connected';
  const { mixer } = useRemoteAudio(createMixer, {
    remotePeers: session.remotePeers,
    enabled: isConnected,
  });

  const audioElement = mixer?.getAudioElement() ?? null;

  useEffect(() => {
    const sampler = samplerRef.current;

    if (!isConnected) {
      sampler.clear();
      detectorRef.current.reset();
      storeRef.current.reset();
      return;
    }

    if (session.localAudioStream && session.localUserId) {
      sampler.addOwned(session.localUserId, session.localAudioStream);
    } else {
      sampler.remove(session.localUserId);
    }

    const currentPeerIds = new Set<string>();
    for (const peer of session.remotePeers) {
      currentPeerIds.add(peer.userId);
      if (mixer) {
        const analyser = mixer.getAnalyser(peer.userId);
        if (analyser) {
          sampler.addBorrowed(peer.userId, analyser);
        }
      }
    }

    for (const id of sampler.ids()) {
      if (id !== session.localUserId && !currentPeerIds.has(id)) {
        sampler.remove(id);
      }
    }
  }, [isConnected, session.localAudioStream, session.localUserId, session.remotePeers, mixer]);

  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      const levels = samplerRef.current.sample();
      storeRef.current.setLevels(levels);

      tickCountRef.current++;
      if (tickCountRef.current % 2 === 0) {
        const speakerId = detectorRef.current.detect(levels);
        storeRef.current.setActiveSpeakerId(speakerId);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      tickCountRef.current = 0;
    };
  }, [isConnected]);

  useEffect(() => {
    const sampler = samplerRef.current;
    const detector = detectorRef.current;
    return () => {
      sampler.dispose();
      detector.reset();
    };
  }, []);

  return (
    <RoomAudioContext.Provider value={{ store: storeRef.current, mixer, audioElement }}>
      {children}
    </RoomAudioContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRoomAudioContext(): RoomAudioContextValue {
  const ctx = useContext(RoomAudioContext);
  if (!ctx) {
    throw new Error('useRoomAudioContext must be used within a RoomAudioContextProvider');
  }

  return ctx;
}
