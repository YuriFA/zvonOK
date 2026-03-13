import { useState, useEffect, useCallback } from 'react';

export type DeviceType = 'videoinput' | 'audioinput' | 'audiooutput';

export interface MediaDevice {
  deviceId: string;
  kind: DeviceType;
  label: string;
  groupId: string;
}

export interface SelectedDevices {
  videoDeviceId: string | null;
  audioDeviceId: string | null;
  speakerDeviceId: string | null;
}

export interface UseMediaDevicesReturn {
  devices: MediaDevice[];
  videoDevices: MediaDevice[];
  audioDevices: MediaDevice[];
  speakerDevices: MediaDevice[];
  selectedDevices: SelectedDevices;
  setSelectedVideoDevice: (deviceId: string | null) => void;
  setSelectedAudioDevice: (deviceId: string | null) => void;
  setSelectedSpeakerDevice: (deviceId: string | null) => void;
  refreshDevices: () => Promise<void>;
  isPermissionGranted: boolean;
  isLoading: boolean;
  error: Error | null;
}

const STORAGE_KEY = 'webrtc-selected-devices';

function loadSelectedDevices(): SelectedDevices {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return {
    videoDeviceId: null,
    audioDeviceId: null,
    speakerDeviceId: null,
  };
}

function saveSelectedDevices(devices: SelectedDevices): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
  } catch {
    // Ignore storage errors
  }
}

function mapMediaDeviceInfo(device: MediaDeviceInfo): MediaDevice {
  return {
    deviceId: device.deviceId,
    kind: device.kind as DeviceType,
    label: device.label || `Unknown ${device.kind}`,
    groupId: device.groupId,
  };
}

export function useMediaDevices(): UseMediaDevicesReturn {
  const [devices, setDevices] = useState<MediaDevice[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<SelectedDevices>(loadSelectedDevices);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshDevices = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Request permissions if not already granted
      if (!isPermissionGranted) {
        // Stop all tracks immediately — we only need the permission prompt
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach((track) => {
          track.stop();
        });
        setIsPermissionGranted(true);
      }

      const rawDevices = await navigator.mediaDevices.enumerateDevices();
      const mappedDevices = rawDevices.map(mapMediaDeviceInfo);
      setDevices(mappedDevices);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to enumerate devices'));
    } finally {
      setIsLoading(false);
    }
  }, [isPermissionGranted]);

  // Initial enumeration
  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  // Listen for device changes
  useEffect(() => {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices || typeof mediaDevices.addEventListener !== 'function') {
      return;
    }

    const handleDeviceChange = () => {
      refreshDevices();
    };

    mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [refreshDevices]);

  // Persist selected devices
  useEffect(() => {
    saveSelectedDevices(selectedDevices);
  }, [selectedDevices]);

  const setSelectedVideoDevice = useCallback((deviceId: string | null) => {
    setSelectedDevices((prev) => ({ ...prev, videoDeviceId: deviceId }));
  }, []);

  const setSelectedAudioDevice = useCallback((deviceId: string | null) => {
    setSelectedDevices((prev) => ({ ...prev, audioDeviceId: deviceId }));
  }, []);

  const setSelectedSpeakerDevice = useCallback((deviceId: string | null) => {
    setSelectedDevices((prev) => ({ ...prev, speakerDeviceId: deviceId }));
  }, []);

  // Derived device lists
  const videoDevices = devices.filter((d) => d.kind === 'videoinput');
  const audioDevices = devices.filter((d) => d.kind === 'audioinput');
  const speakerDevices = devices.filter((d) => d.kind === 'audiooutput');

  return {
    devices,
    videoDevices,
    audioDevices,
    speakerDevices,
    selectedDevices,
    setSelectedVideoDevice,
    setSelectedAudioDevice,
    setSelectedSpeakerDevice,
    refreshDevices,
    isPermissionGranted,
    isLoading,
    error,
  };
}
