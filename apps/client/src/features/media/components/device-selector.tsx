import { useCallback } from 'react';
import { useMediaControls } from '../hooks/use-media-controls';
import { DeviceControlGroup } from './device-control-group';
import { LocalVideo } from '@/components/local-video';
import { cn } from '@/lib/utils';
import { useMediaStreamContext } from '../contexts/media-stream.context';
import { useMediaToggle } from '../contexts/media-manager.context';
import { useMediaDevices } from '../hooks/use-media-devices';
import { useDeviceSwitching } from '../hooks/use-device-switching';

interface DeviceSelectorProps {
  className?: string;
  username?: string;
}

export function DeviceSelector({ className, username }: DeviceSelectorProps) {
  const { stream, error, isLoading } = useMediaStreamContext();
  const mediaToggle = useMediaToggle();
  const mediaControls = useMediaControls();

  const {
    videoDevices,
    audioDevices,
    speakerDevices,
    selectedDevices,
    setSelectedVideoDevice,
    setSelectedAudioDevice,
    setSelectedSpeakerDevice,
  } = useMediaDevices();

  const { switchVideoDevice, switchAudioDevice, isSpeakerSwitchSupported } = useDeviceSwitching();

  const handleToggleVideo = useCallback(async () => {
    const nextEnabled = !mediaControls.isVideoEnabled;
    mediaControls.setVideoEnabled(nextEnabled);
    const success = await mediaToggle.toggleVideo(nextEnabled);
    if (!success) {
      mediaControls.setVideoEnabled(false);
    }
  }, [mediaToggle, mediaControls]);

  const handleToggleAudio = useCallback(async () => {
    const nextEnabled = !mediaControls.isAudioEnabled;
    mediaControls.setAudioEnabled(nextEnabled);
    const success = await mediaToggle.toggleAudio(nextEnabled);
    if (!success) {
      mediaControls.setAudioEnabled(false);
    }
  }, [mediaToggle, mediaControls]);

  const handleVideoDeviceChange = useCallback(
    async (deviceId: string) => {
      const success = await switchVideoDevice(deviceId);
      if (success) {
        setSelectedVideoDevice(deviceId);
      }
    },
    [switchVideoDevice, setSelectedVideoDevice]
  );

  const handleAudioDeviceChange = useCallback(
    async (deviceId: string) => {
      const success = await switchAudioDevice(deviceId);
      if (success) {
        setSelectedAudioDevice(deviceId);
      }
    },
    [switchAudioDevice, setSelectedAudioDevice]
  );

  const handleSpeakerDeviceChange = useCallback(
    (deviceId: string) => {
      setSelectedSpeakerDevice(deviceId);
    },
    [setSelectedSpeakerDevice]
  );

  const hasStream = !!stream && !error;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading camera...</p>
          </div>
        )}
        {error && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        {!isLoading && !error && stream && (
          <LocalVideo
            stream={stream}
            username={username}
            isVideoEnabled={mediaControls.isVideoEnabled}
            isAudioEnabled={mediaControls.isAudioEnabled}
            className="h-full"
            showControls={false}
          />
        )}
      </div>

      <div className="flex items-center justify-center gap-2">
        <DeviceControlGroup
          type="audioinput"
          isEnabled={mediaControls.isAudioEnabled}
          onToggle={handleToggleAudio}
          devices={audioDevices}
          selectedDeviceId={selectedDevices.audioDeviceId}
          onDeviceChange={handleAudioDeviceChange}
          disabled={!hasStream}
        />

        {isSpeakerSwitchSupported && (
          <DeviceControlGroup
            type="audiooutput"
            devices={speakerDevices}
            selectedDeviceId={selectedDevices.speakerDeviceId}
            onDeviceChange={handleSpeakerDeviceChange}
          />
        )}

        <DeviceControlGroup
          type="videoinput"
          isEnabled={mediaControls.isVideoEnabled}
          onToggle={handleToggleVideo}
          devices={videoDevices}
          selectedDeviceId={selectedDevices.videoDeviceId}
          onDeviceChange={handleVideoDeviceChange}
          disabled={!hasStream}
        />
      </div>
    </div>
  );
}
