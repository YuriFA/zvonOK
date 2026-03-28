import { useEffect, useRef } from 'react';
import type { IRemoteAudioMixer } from '@/lib/audio/remote-audio-mixer';

interface RemoteAudioProps {
  mixer: IRemoteAudioMixer | null;
}

export function RemoteAudio({ mixer }: RemoteAudioProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appendedRef = useRef(false);

  useEffect(() => {
    if (!mixer || !containerRef.current || appendedRef.current) return;

    const audioElement = mixer.getAudioElement();
    containerRef.current.appendChild(audioElement);
    appendedRef.current = true;

    void audioElement.play().catch(() => { });

    return () => {
      audioElement.remove();
      appendedRef.current = false;
    };
  }, [mixer]);

  return <div ref={containerRef} id="audio-container" hidden />;
}
