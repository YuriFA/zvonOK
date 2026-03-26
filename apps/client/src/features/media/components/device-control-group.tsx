import { useCallback } from 'react';
import { Video, VideoOff, Mic, MicOff, Volume2, ChevronDown, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { MediaDevice, DeviceType } from '../hooks/use-media-devices';
import { CaptureState, getCaptureStateDisplay, canToggle } from '@/lib/media/capture-state';

export interface DeviceControlGroupProps {
  type: DeviceType;
  captureState?: CaptureState;
  onToggle?: () => void;
  devices: MediaDevice[];
  selectedDeviceId: string | null;
  onDeviceChange: (deviceId: string) => void;
  isSwitching?: boolean;
  className?: string;
}

const deviceConfig: Record<DeviceType, { label: string; kind: 'video' | 'audio' }> = {
  videoinput: { label: 'Camera', kind: 'video' },
  audioinput: { label: 'Microphone', kind: 'audio' },
  audiooutput: { label: 'Speaker', kind: 'audio' },
};

export function DeviceControlGroup({
  type,
  captureState = CaptureState.STOPPED,
  onToggle,
  devices,
  selectedDeviceId,
  onDeviceChange,
  isSwitching = false,
  className,
}: DeviceControlGroupProps) {
  const config = deviceConfig[type];
  const hasDevices = devices.length > 0;
  const isOutputDevice = type === 'audiooutput';
  const display = getCaptureStateDisplay(captureState, config.kind);
  const toggleEnabled = canToggle(captureState) && hasDevices;
  const dropdownEnabled = captureState === CaptureState.ACTIVE && hasDevices && !isSwitching;

  const handleDeviceSelect = useCallback(
    (deviceId: string) => {
      if (deviceId !== selectedDeviceId) {
        onDeviceChange(deviceId);
      }
    },
    [onDeviceChange, selectedDeviceId],
  );

  if (isOutputDevice) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasDevices || isSwitching}
              className={cn('gap-2', className)}
              title={config.label}
            />
          }
        >
          <Volume2 className="size-5" />
          <ChevronDown className="size-4" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="center" className="min-w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{config.label}</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {devices.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">No devices available</div>
            ) : (
              devices.map((device) => (
                <DropdownMenuItem
                  key={device.deviceId}
                  onClick={() => handleDeviceSelect(device.deviceId)}
                >
                  <span className="flex-1 truncate">{device.label}</span>
                  {device.deviceId === selectedDeviceId && <Check className="size-4" />}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const renderIcon = () => {
    if (display.icon === 'spinner') {
      return <Loader2 className="size-5 animate-spin" />;
    }
    if (display.icon === 'off-warning' || display.icon === 'off-error') {
      return <AlertTriangle className={cn('size-5', display.icon === 'off-warning' && 'text-yellow-500')} />;
    }
    const isOn = display.icon === 'on';
    if (type === 'videoinput') {
      return isOn ? <Video className="size-5" /> : <VideoOff className="size-5" />;
    }
    return isOn ? <Mic className="size-5" /> : <MicOff className="size-5" />;
  };

  return (
    <div className={cn('inline-flex rounded-lg border', className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onToggle}
        disabled={!toggleEnabled && captureState !== CaptureState.CAPTURE_CANCELED}
        className={cn(
          'rounded-r-none border-r px-3',
          !canToggle(captureState) && captureState !== CaptureState.CAPTURE_CANCELED && 'text-muted-foreground',
        )}
        title={display.tooltip}
      >
        {renderIcon()}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!dropdownEnabled}
              className="rounded-l-none px-2"
              title={`Select ${config.label}`}
            />
          }
        >
          <ChevronDown className="size-4" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="center" className="min-w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{config.label}</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {devices.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">No devices available</div>
            ) : (
              devices.map((device) => (
                <DropdownMenuItem
                  key={device.deviceId}
                  onClick={() => handleDeviceSelect(device.deviceId)}
                >
                  <span className="flex-1 truncate">{device.label}</span>
                  {device.deviceId === selectedDeviceId && <Check className="size-4" />}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {display.statusText && (
        <div className="flex items-center px-2 text-xs text-muted-foreground">
          {display.statusText}
        </div>
      )}
    </div>
  );
}
