/**
 * Media manager context for dependency injection.
 * Provides IMediaManager to components and hooks.
 */

import { createContext, useContext, type ReactNode } from 'react';
import type { IMediaManager } from '@/lib/media/interfaces';

const MediaManagerContext = createContext<IMediaManager | null>(null);

export interface MediaManagerProviderProps {
  manager: IMediaManager;
  children: ReactNode;
}

export function MediaManagerProvider({
  manager,
  children,
}: MediaManagerProviderProps) {
  return (
    <MediaManagerContext.Provider value={manager}>
      {children}
    </MediaManagerContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMediaManager(): IMediaManager {
  const manager = useContext(MediaManagerContext);

  if (!manager) {
    throw new Error(
      'useMediaManager must be used within a MediaManagerProvider'
    );
  }

  return manager;
}
