import { Settings, X, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useDeviceSwitching } from "../hooks/use-device-switching";
import { useMediaDevices } from "../hooks/use-media-devices";
import { ActiveDeviceDisplay } from "./active-device-display";
import { SingleDeviceSelector } from "./single-device-selector";

export interface DeviceSettingsPanelProps {
  audioElement?: HTMLAudioElement | null;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  className?: string;
}

export function DeviceSettingsPanel({
  audioElement,
  isVideoEnabled,
  isAudioEnabled,
  className,
}: DeviceSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState<"video" | "audio" | "speaker" | null>(null);
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

    switchSpeakerDevice(speakerElement, speakerDeviceId).catch(() => {});
  }, [
    isSpeakerSwitchSupported,
    selectedDevices.speakerDeviceId,
    switchSpeakerDevice,
    speakerElement,
  ]);

  const handleVideoChange = useCallback(
    async (deviceId: string) => {
      setIsSwitching("video");
      try {
        const success = await switchVideoDevice(deviceId);
        if (success) {
          setSelectedVideoDevice(deviceId);
        }
      } finally {
        setIsSwitching(null);
      }
    },
    [switchVideoDevice, setSelectedVideoDevice],
  );

  const handleAudioChange = useCallback(
    async (deviceId: string) => {
      setIsSwitching("audio");
      try {
        const success = await switchAudioDevice(deviceId);
        if (success) {
          setSelectedAudioDevice(deviceId);
        }
      } finally {
        setIsSwitching(null);
      }
    },
    [switchAudioDevice, setSelectedAudioDevice],
  );

  const handleSpeakerChange = useCallback(
    async (deviceId: string) => {
      setIsSwitching("speaker");
      try {
        setSelectedSpeakerDevice(deviceId);

        if (speakerElement) {
          await switchSpeakerDevice(speakerElement, deviceId);
        }
      } finally {
        setIsSwitching(null);
      }
    },
    [switchSpeakerDevice, speakerElement, setSelectedSpeakerDevice],
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

  return (
    <div ref={containerRef} className={cn("relative", className)}>
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
          <div className="absolute top-full right-0 z-50 mt-2 w-72 rounded-lg border bg-background p-4 shadow-lg">
            <h3 className="mb-4 font-medium">Device Settings</h3>
            {renderSelectors()}
          </div>
        </>
      )}
    </div>
  );
}
