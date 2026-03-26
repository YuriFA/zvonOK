import { useCallback } from 'react';
import { useMediaControls } from '../hooks/use-media-controls';
import { DeviceControlGroup } from './device-control-group';
import { LocalVideo } from '@/components/local-video';
import { cn } from '@/lib/utils';
import { useMediaStreamContext } from '../contexts/media-stream.context';
import { useVideoCaptureControl, useAudioCaptureControl, useVideoCaptureState, useAudioCaptureState } from '../contexts/media-manager.context';
import { useMediaDevices } from '../hooks/use-media-devices';
import { useDeviceSwitching } from '../hooks/use-device-switching';
import { CaptureState, isActive } from '@/lib/media/capture-state';

interface DeviceSelectorProps {
  className?: string;
  username?: string;
}

export function DeviceSelector({ className, username }: DeviceSelectorProps) {
  const { stream, videoState, audioState } = useMediaStreamContext();
  const mediaControls = useMediaControls();

  const videoControl = useVideoCaptureControl();
  const audioControl = useAudioCaptureControl();
  const videoStateReader = useVideoCaptureState();
  const audioStateReader = useAudioCaptureState();

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
    const nextEnabled = !isActive(videoStateReader.getState());
    mediaControls.setVideoEnabled(nextEnabled);
    const success = await videoControl.toggle(nextEnabled);
    if (!success) {
      mediaControls.setVideoEnabled(false);
    }
  }, [videoControl, videoStateReader, mediaControls]);

  const handleToggleAudio = useCallback(async () => {
    const nextEnabled = !isActive(audioStateReader.getState());
    mediaControls.setAudioEnabled(nextEnabled);
    const success = await audioControl.toggle(nextEnabled);
    if (!success) {
      mediaControls.setAudioEnabled(false);
    }
  }, [audioControl, audioStateReader, mediaControls]);

  const handleVideoDeviceChange = useCallback(
    async (deviceId: string) => {
      const success = await switchVideoDevice(deviceId);
      if (success) {
        setSelectedVideoDevice(deviceId);
      }
    },
    [switchVideoDevice, setSelectedVideoDevice],
  );

  const handleAudioDeviceChange = useCallback(
    async (deviceId: string) => {
      const success = await switchAudioDevice(deviceId);
      if (success) {
        setSelectedAudioDevice(deviceId);
      }
    },
    [switchAudioDevice, setSelectedAudioDevice],
  );

  const handleSpeakerDeviceChange = useCallback(
    (deviceId: string) => {
      setSelectedSpeakerDevice(deviceId);
    },
    [setSelectedSpeakerDevice],
  );

  const isVideoLoading = videoState === CaptureState.STARTING;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
        {isVideoLoading && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading camera...</p>
          </div>
        )}
        {!isVideoLoading && stream && (
          <LocalVideo
            stream={stream}
            username={username}
            isVideoEnabled={isActive(videoState)}
            className="h-full"
          />
        )}
      </div>

      <div className="flex items-center justify-center gap-2">
        <DeviceControlGroup
          type="audioinput"
          captureState={audioState}
          onToggle={handleToggleAudio}
          devices={audioDevices}
          selectedDeviceId={selectedDevices.audioDeviceId}
          onDeviceChange={handleAudioDeviceChange}
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
          captureState={videoState}
          onToggle={handleToggleVideo}
          devices={videoDevices}
          selectedDeviceId={selectedDevices.videoDeviceId}
          onDeviceChange={handleVideoDeviceChange}
        />
      </div>
    </div>
  );
}

// function getVideoPreviewDisplay(state: CaptureState): string | null {
//   if (state === CaptureState.SYSTEM_DENIED) return 'Camera blocked in system settings';
//   if (state === CaptureState.DEVICE_NOT_FOUND) return 'Camera blocked. Click to retry.';
//   if (state === CaptureState.DEVICE_IN_USE) return 'Camera in use by another app';
//   if (state === CaptureState.NO_DEVICE) return 'No camera found';
//   if (state === CaptureState.DEVICE_ERROR) return 'Camera unavailable';
//   return null;
// }
