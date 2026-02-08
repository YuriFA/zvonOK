import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaDeviceInfo {
  deviceId: string;
  kind: MediaDeviceKind;
  label: string;
}

interface DeviceSelectorProps {
  className?: string;
}

export function DeviceSelector({ className }: DeviceSelectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get initial media stream
  const getStream = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Get device list
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputDevices = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d) => ({
          deviceId: d.deviceId,
          kind: d.kind as MediaDeviceKind,
          label: d.label || `Camera ${videoDevices.length + 1}`,
        }));

      const audioInputDevices = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({
          deviceId: d.deviceId,
          kind: d.kind as MediaDeviceKind,
          label: d.label || `Microphone ${audioDevices.length + 1}`,
        }));

      setVideoDevices(videoInputDevices);
      setAudioDevices(audioInputDevices);

      // Set default devices
      if (videoInputDevices.length > 0) {
        setSelectedVideoDevice(videoInputDevices[0].deviceId);
      }
      if (audioInputDevices.length > 0) {
        setSelectedAudioDevice(audioInputDevices[0].deviceId);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to access camera/microphone'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Change video device
  const changeVideoDevice = async (deviceId: string) => {
    if (!stream) return;

    try {
      // Stop current video tracks
      stream.getVideoTracks().forEach((track) => track.stop());

      // Get new stream with selected device
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: { deviceId: { exact: selectedAudioDevice } },
      });

      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      setSelectedVideoDevice(deviceId);
    } catch (err) {
      console.error('Failed to change video device:', err);
    }
  };

  // Change audio device
  const changeAudioDevice = async (deviceId: string) => {
    if (!stream) return;

    try {
      // Stop current audio tracks
      stream.getAudioTracks().forEach((track) => track.stop());

      // Get new stream with selected device
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: selectedVideoDevice } },
        audio: { deviceId: { exact: deviceId } },
      });

      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      setSelectedAudioDevice(deviceId);
    } catch (err) {
      console.error('Failed to change audio device:', err);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setVideoEnabled(videoTrack.enabled);
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setAudioEnabled(audioTrack.enabled);
    }
  };

  // Get stream on mount
  useEffect(() => {
    getStream();

    return () => {
      // Clean up stream on unmount
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Video Preview */}
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
        {!isLoading && !error && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        )}

        {/* Toggle Buttons */}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={toggleVideo}
            disabled={!stream || !!error}
          >
            {videoEnabled ? (
              <Video className="size-5" />
            ) : (
              <VideoOff className="size-5" />
            )}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={toggleAudio}
            disabled={!stream || !!error}
          >
            {audioEnabled ? (
              <Mic className="size-5" />
            ) : (
              <MicOff className="size-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Device Selection */}
      {videoDevices.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor="video-device">Camera</Label>
          <select
            id="video-device"
            value={selectedVideoDevice}
            onChange={(e) => changeVideoDevice(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {videoDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {audioDevices.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor="audio-device">Microphone</Label>
          <select
            id="audio-device"
            value={selectedAudioDevice}
            onChange={(e) => changeAudioDevice(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {audioDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
