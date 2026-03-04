import { useCallback, useEffect, useRef, useState } from 'react';
import { Settings, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useMediaDevices,
  useDeviceSwitching,
} from '../hooks';
import { SingleDeviceSelector } from './single-device-selector';
import { ActiveDeviceDisplay } from './active-device-display';
import { cn } from '@/lib/utils';

export interface DeviceSettingsPanelProps {
  /** Remote video element for speaker switching */
  remoteVideoElement?: HTMLMediaElement | null;
  /** Whether video is currently enabled (for ActiveDeviceDisplay) */
  isVideoEnabled?: boolean;
  /** Whether audio is currently enabled (for ActiveDeviceDisplay) */
  isAudioEnabled?: boolean;
  /** Called when video device changes */
  onVideoDeviceChange?: (deviceId: string) => void;
  /** Called when audio device changes */
  onAudioDeviceChange?: (deviceId: string) => void;
  /** Called when speaker device changes */
  onSpeakerDeviceChange?: (deviceId: string) => void;
  /** Additional class names */
  className?: string;
  /** Whether to show as a button + popover or inline panel */
  variant?: 'popover' | 'inline';
}

export function DeviceSettingsPanel({
  remoteVideoElement,
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

  // Primary media element for speaker switching
  const videoElementForSpeaker = remoteVideoElement ?? null;

  const activeCamera =
    videoDevices.find((d) => d.deviceId === selectedDevices.videoDeviceId) ?? videoDevices[0];
  const activeMicrophone =
    audioDevices.find((d) => d.deviceId === selectedDevices.audioDeviceId) ?? audioDevices[0];
  const activeSpeaker =
    speakerDevices.find((d) => d.deviceId === selectedDevices.speakerDeviceId) ?? speakerDevices[0];

  // Apply the saved speaker selection when a remote media element becomes available.
  useEffect(() => {
    const speakerDeviceId = selectedDevices.speakerDeviceId;
    if (!isSpeakerSwitchSupported || !videoElementForSpeaker || !speakerDeviceId) return;

    switchSpeakerDevice(videoElementForSpeaker, speakerDeviceId).catch(() => {
      // best-effort
    });
  }, [isSpeakerSwitchSupported, selectedDevices.speakerDeviceId, switchSpeakerDevice, videoElementForSpeaker]);

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
        // Always persist selection (so it can be applied later when a remote element exists)
        setSelectedSpeakerDevice(deviceId);
        onSpeakerDeviceChange?.(deviceId);

        // Best-effort immediate apply if we have a media element
        if (videoElementForSpeaker) {
          await switchSpeakerDevice(videoElementForSpeaker, deviceId);
        }
      } finally {
        setIsSwitching(null);
      }
    },
    [switchSpeakerDevice, videoElementForSpeaker, setSelectedSpeakerDevice, onSpeakerDeviceChange]
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
