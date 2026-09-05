/**
 * Device controls hook: a thin wrapper over the shared @zvonok/client media
 * manager. Start/stop camera and mic, toggle, switch devices, enumerate.
 */

import type { CaptureState } from "@zvonok/client/media/capture-state";
import type { IMediaManager } from "@zvonok/client/media/interfaces";
import { useEffect, useMemo, useState } from "react";

import { useZvonokSession } from "./zvonok-context.js";

export interface ZvonokCaptureControl {
  state: CaptureState;
  track: MediaStreamTrack | null;
  toggle(enabled: boolean): Promise<boolean>;
  switchDevice(deviceId: string): Promise<boolean>;
}

export interface UseDeviceControlsResult {
  camera: ZvonokCaptureControl;
  mic: ZvonokCaptureControl;
  start(options?: {
    video?: boolean;
    audio?: boolean;
    videoDeviceId?: string;
    audioDeviceId?: string;
  }): Promise<void>;
  stop(): void;
  enumerateDevices(): Promise<MediaDeviceInfo[]>;
}

interface CaptureSnapshot {
  state: CaptureState;
  track: MediaStreamTrack | null;
}

function snapshot(capture: { getState(): CaptureState; getTrack(): MediaStreamTrack | null }): CaptureSnapshot {
  return { state: capture.getState(), track: capture.getTrack() };
}

export function useDeviceControls(): UseDeviceControlsResult {
  const session = useZvonokSession();
  const mediaManager: IMediaManager = session.mediaManager;
  const [cameraSnapshot, setCameraSnapshot] = useState<CaptureSnapshot>(() =>
    snapshot(mediaManager.videoCapture),
  );
  const [micSnapshot, setMicSnapshot] = useState<CaptureSnapshot>(() =>
    snapshot(mediaManager.audioCapture),
  );

  useEffect(() => {
    const unsubscribeVideo = mediaManager.onVideoStateChange((state, track) =>
      setCameraSnapshot({ state, track: track ?? null }),
    );
    const unsubscribeAudio = mediaManager.onAudioStateChange((state, track) =>
      setMicSnapshot({ state, track: track ?? null }),
    );
    return () => {
      unsubscribeVideo();
      unsubscribeAudio();
    };
  }, [mediaManager]);

  return useMemo(
    () => ({
      camera: {
        ...cameraSnapshot,
        toggle: (enabled: boolean) => mediaManager.videoCapture.toggle(enabled),
        switchDevice: (deviceId: string) => mediaManager.videoCapture.switchDevice(deviceId),
      },
      mic: {
        ...micSnapshot,
        toggle: (enabled: boolean) => mediaManager.audioCapture.toggle(enabled),
        switchDevice: (deviceId: string) => mediaManager.audioCapture.switchDevice(deviceId),
      },
      start: (options?: {
        video?: boolean;
        audio?: boolean;
        videoDeviceId?: string;
        audioDeviceId?: string;
      }) => mediaManager.start(options),
      stop: () => mediaManager.stop(),
      enumerateDevices: () => mediaManager.getDeviceService().enumerateDevices(),
    }),
    [cameraSnapshot, micSnapshot, mediaManager],
  );
}
