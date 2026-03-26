import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '@/lib/constants/storage-keys';
import { useDeviceService } from '@/features/media/contexts/media-manager.context';

export type DeviceType = 'videoinput' | 'audioinput' | 'audiooutput';

export interface MediaDevice {
  deviceId: string;
  kind: DeviceType;
  label: string;
}

export interface SelectedDevices {
  videoDeviceId: string | null;
  audioDeviceId: string | null;
  speakerDeviceId: string | null;
}

export interface UseMediaDevicesReturn {
  videoDevices: MediaDevice[];
  audioDevices: MediaDevice[];
  speakerDevices: MediaDevice[];
  selectedDevices: SelectedDevices;
  setSelectedVideoDevice: (deviceId: string | null) => void;
  setSelectedAudioDevice: (deviceId: string | null) => void;
  setSelectedSpeakerDevice: (deviceId: string | null) => void;
  isLoading: boolean;
}

export function loadSelectedDevices(): SelectedDevices {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SELECTED_DEVICES);
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
    localStorage.setItem(STORAGE_KEYS.SELECTED_DEVICES, JSON.stringify(devices));
  } catch {
    // Ignore storage errors
  }
}

export function useMediaDevices(): UseMediaDevicesReturn {
  const [devices, setDevices] = useState<MediaDevice[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<SelectedDevices>(loadSelectedDevices);
  const [isLoading, setIsLoading] = useState(true);
  // const isPermissionGranted = useRef(false);
  const deviceService = useDeviceService();

  useEffect(() => {
    const handleDeviceChange = async () => {
      setIsLoading(true);

      try {
        // if (!isPermissionGranted.current) {
        //   const stream = await deviceService.getUserMedia({ video: true, audio: true });
        //   stream.getTracks().forEach((t) => t.stop());
        //   isPermissionGranted.current = true;
        // }

        const rawDevices = await deviceService.enumerateDevices();
        const mappedDevices = rawDevices.map((device): MediaDevice => {
          return {
            deviceId: device.deviceId,
            kind: device.kind,
            label: device.label || `Unknown ${device.kind}`,
          };
        });
        setDevices(mappedDevices);
      } catch (error) {
        console.warn('Failed to enumerate devices', error);
      } finally {
        setIsLoading(false);
      }
    };

    handleDeviceChange();
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [deviceService]);

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

  const videoDevices = devices.filter((d) => d.kind === 'videoinput');
  const audioDevices = devices.filter((d) => d.kind === 'audioinput');
  const speakerDevices = devices.filter((d) => d.kind === 'audiooutput');

  return {
    videoDevices,
    audioDevices,
    speakerDevices,
    selectedDevices,
    setSelectedVideoDevice,
    setSelectedAudioDevice,
    setSelectedSpeakerDevice,
    isLoading,
  };
}
