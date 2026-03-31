import { createContext, useContext, type ReactNode } from "react";

import type {
  IMediaManager,
  ICaptureStateReader,
  ICaptureController,
  ICaptureTrackProvider,
  IMediaDeviceService,
} from "@/lib/media/interfaces";

const MediaManagerContext = createContext<IMediaManager | null>(null);

export interface MediaManagerProviderProps {
  manager: IMediaManager;
  children: ReactNode;
}

export function MediaManagerProvider({ manager, children }: MediaManagerProviderProps) {
  return <MediaManagerContext.Provider value={manager}>{children}</MediaManagerContext.Provider>;
}

function useMediaManager(): IMediaManager {
  const manager = useContext(MediaManagerContext);
  if (!manager) {
    throw new Error("useMediaManager must be used within a MediaManagerProvider");
  }
  return manager;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useVideoCaptureState(): ICaptureStateReader {
  return useMediaManager().videoCapture;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAudioCaptureState(): ICaptureStateReader {
  return useMediaManager().audioCapture;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useVideoCaptureControl(): ICaptureController {
  return useMediaManager().videoCapture;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAudioCaptureControl(): ICaptureController {
  return useMediaManager().audioCapture;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCaptureTrackProvider(kind: "video" | "audio"): ICaptureTrackProvider {
  const manager = useMediaManager();
  return kind === "video" ? manager.videoCapture : manager.audioCapture;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDeviceService(): IMediaDeviceService {
  return useMediaManager().getDeviceService();
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMediaManagerDirect(): IMediaManager {
  return useMediaManager();
}
