/**
 * SFU manager context for dependency injection.
 * Provides ISfuManager to components and hooks.
 */

import { createContext, useContext, type ReactNode } from "react";

import type { ISfuManager } from "@/lib/sfu/interfaces";

const SfuManagerContext = createContext<ISfuManager | null>(null);

export interface SfuManagerProviderProps {
  manager: ISfuManager;
  children: ReactNode;
}

export function SfuManagerProvider({ manager, children }: SfuManagerProviderProps) {
  return <SfuManagerContext.Provider value={manager}>{children}</SfuManagerContext.Provider>;
}

/**
 * Hook to access the SFU manager from context.
 * Throws if used outside of SfuManagerProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSfuManager(): ISfuManager {
  const manager = useContext(SfuManagerContext);
  if (!manager) {
    throw new Error("useSfuManager must be used within a SfuManagerProvider");
  }
  return manager;
}
