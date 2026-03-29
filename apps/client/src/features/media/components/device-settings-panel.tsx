import { useCallback, useEffect, useRef, useState } from 'react';
import { Settings, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMediaDevices } from '../hooks/use-media-devices';
import { useDeviceSwitching } from '../hooks/use-device-switching';
import { SingleDeviceSelector } from './single-device-selector';
import { ActiveDeviceDisplay } from './active-device-display';
import { cn } from '@/lib/utils';

export interface DeviceSettingsPanelProps {
  audioElement?: HTMLAudioElement | null;
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
  onVideoDeviceChange?: (deviceId: string) => void;
  onAudioDeviceChange?: (deviceId: string) => void;
  onSpeakerDeviceChange?: (deviceId: string) => void;
  className?: string;
  variant?: 'popover' | 'inline';
}

export function DeviceSettingsPanel({
  audioElement,
  isVideoEnabled = true,
  isAudioEnabled = true,
  onVideoDeviceChange,
  onAudioDeviceChange,
  onSpeakerDeviceChange,
  className,
  variant = 'popover',
}: DeviceSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState<'video' | 'audio' | 'speaker' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    videoDevices,
    audioDevices,
    speakerDevices,
    selectedDevices,
    setSelectedVideoDevice,
    setSelectedAudioDevice,
    setSelectedSpeakerDevice,
    isLoading,
  } = useMediaDevices();

  const { switchVideoDevice, switchAudioDevice, switchSpeakerDevice, isSpeakerSwitchSupported } =
    useDeviceSwitching();

  const speakerElement = audioElement ?? null;

  const activeCamera =
    videoDevices.find((d) => d.deviceId === selectedDevices.videoDeviceId) ?? videoDevices[0];
  const activeMicrophone =
    audioDevices.find((d) => d.deviceId === selectedDevices.audioDeviceId) ?? audioDevices[0];
  const activeSpeaker =
    speakerDevices.find((d) => d.deviceId === selectedDevices.speakerDeviceId) ?? speakerDevices[0];

  // Apply the saved speaker selection when a remote media element becomes available.
  useEffect(() => {
    const speakerDeviceId = selectedDevices.speakerDeviceId;
    if (!isSpeakerSwitchSupported || !speakerElement || !speakerDeviceId) return;

    switchSpeakerDevice(speakerElement, speakerDeviceId).catch(() => {
    });
  }, [isSpeakerSwitchSupported, selectedDevices.speakerDeviceId, switchSpeakerDevice, speakerElement]);

  const handleVideoChange = useCallback(
    async (deviceId: string) => {
      setIsSwitching('video');
      try {
        const success = await switchVideoDevice(deviceId);
        if (success) {
          setSelectedVideoDevice(deviceId);
          onVideoDeviceChange?.(deviceId);
        }
      } finally {
        setIsSwitching(null);
      }
    },
    [switchVideoDevice, setSelectedVideoDevice, onVideoDeviceChange]
  );

  const handleAudioChange = useCallback(
    async (deviceId: string) => {
      setIsSwitching('audio');
      try {
        const success = await switchAudioDevice(deviceId);
        if (success) {
          setSelectedAudioDevice(deviceId);
          onAudioDeviceChange?.(deviceId);
        }
      } finally {
        setIsSwitching(null);
      }
    },
    [switchAudioDevice, setSelectedAudioDevice, onAudioDeviceChange]
  );

  const handleSpeakerChange = useCallback(
    async (deviceId: string) => {
      setIsSwitching('speaker');
      try {
        setSelectedSpeakerDevice(deviceId);
        onSpeakerDeviceChange?.(deviceId);

        if (speakerElement) {
          await switchSpeakerDevice(speakerElement, deviceId);
        }
      } finally {
        setIsSwitching(null);
      }
    },
    [switchSpeakerDevice, speakerElement, setSelectedSpeakerDevice, onSpeakerDeviceChange]
  );

  const renderSelectors = () => (
    <div className="space-y-4">
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading devices...
        </div>
      )}

      <ActiveDeviceDisplay
        camera={activeCamera}
        microphone={activeMicrophone}
        speaker={activeSpeaker}
        isVideoEnabled={isVideoEnabled}
        isAudioEnabled={isAudioEnabled}
      />

      <SingleDeviceSelector
        type="videoinput"
        devices={videoDevices}
        selectedDeviceId={selectedDevices.videoDeviceId}
        onDeviceChange={handleVideoChange}
        disabled={isSwitching !== null}
      />

      <SingleDeviceSelector
        type="audioinput"
        devices={audioDevices}
        selectedDeviceId={selectedDevices.audioDeviceId}
        onDeviceChange={handleAudioChange}
        disabled={isSwitching !== null}
      />

      {isSpeakerSwitchSupported && (
        <SingleDeviceSelector
          type="audiooutput"
          devices={speakerDevices}
          selectedDeviceId={selectedDevices.speakerDeviceId}
          onDeviceChange={handleSpeakerChange}
          disabled={isSwitching !== null}
        />
      )}

      {isSwitching && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Switching {isSwitching}...
        </div>
      )}
    </div>
  );

  if (variant === 'inline') {
    return (
      <div className={cn('rounded-lg border p-4', className)}>
        <h3 className="mb-4 font-medium">Device Settings</h3>
        {renderSelectors()}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        title="Device settings"
      >
        {isOpen ? <X className="size-5" /> : <Settings className="size-5" />}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            aria-label="Close device settings"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border bg-background p-4 shadow-lg">
            <h3 className="mb-4 font-medium">Device Settings</h3>
            {renderSelectors()}
          </div>
        </>
      )}
    </div>
  );
}
