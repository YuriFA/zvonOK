import { PeerQualityStore } from './peer-quality.store';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useSfuManager } from '@/features/sfu/contexts/sfu-manager.context';

export interface PeerQualityContextValue {
  store: PeerQualityStore;
}

const PeerQualityContext = createContext<PeerQualityContextValue | null>(null);

interface Props {
  enabled?: boolean;
  children: ReactNode;
}

export function PeerQualityProvider({ enabled = true, children }: Props) {
  const storeRef = useRef<PeerQualityStore>(new PeerQualityStore());
  const sfuManager = useSfuManager();

  useEffect(() => {
    if (!enabled) {
      storeRef.current.reset();
      return;
    }

    const store = storeRef.current;

    const unsubscribe = sfuManager.onQualityStats((stats) => {
      store.setStats(stats);
    });

    sfuManager.startStatsCollection(2000);

    return () => {
      unsubscribe();
      sfuManager.stopStatsCollection();
      store.reset();
    };
  }, [enabled, sfuManager]);

  return (
    <PeerQualityContext.Provider value={{ store: storeRef.current }}>
      {children}
    </PeerQualityContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePeerQualityContext(): PeerQualityContextValue {
  const ctx = useContext(PeerQualityContext);
  if (!ctx) {
    throw new Error('usePeerQualityContext must be used within a PeerQualityProvider');
  }
  return ctx;
}
