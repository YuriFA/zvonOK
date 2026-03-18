/**
 * Media manager context for dependency injection.
 * Provides IMediaManager to components and hooks.
 *
 * Narrower hooks (useMediaAcquisition, useMediaTrackController, etc.) expose
 * only the slice of IMediaManager that each consumer actually needs,
 * following the Interface Segregation Principle without requiring separate
 * React contexts.
 *
 * useMediaManager is intentionally kept internal (no export) to enforce ISP:
 * consumers must pick the narrowest hook that covers their needs.
 */

import { createContext, useContext, type ReactNode } from 'react';
import type {
  IMediaManager,
  IMediaAcquisition,
  IMediaTrackController,
  IMediaDeviceSelector,
  IMediaPermissionChecker,
  IMediaStateNotifier,
  IMediaToggle,
} from '@/lib/media/interfaces';

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

function useMediaManager(): IMediaManager {
  const manager = useContext(MediaManagerContext);

  if (!manager) {
    throw new Error(
      'useMediaManager must be used within a MediaManagerProvider'
    );
  }

  return manager;
}

// -- ISP: Narrower hooks -----------------------------------------------

// eslint-disable-next-line react-refresh/only-export-components
export function useMediaAcquisition(): IMediaAcquisition {
  return useMediaManager();
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMediaTrackController(): IMediaTrackController {
  return useMediaManager();
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMediaDeviceSelector(): IMediaDeviceSelector {
  return useMediaManager();
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMediaPermissionChecker(): IMediaPermissionChecker {
  return useMediaManager();
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMediaStateNotifier(): IMediaStateNotifier {
  return useMediaManager();
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMediaToggle(): IMediaToggle {
  return useMediaManager();
}
