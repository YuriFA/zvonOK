import { useCallback } from 'react';
import { Video, VideoOff, Mic, MicOff, Volume2, ChevronDown, Check } from 'lucide-react';
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

export interface DeviceControlGroupProps {
  type: DeviceType;
  isEnabled?: boolean;
  onToggle?: () => void;
  devices: MediaDevice[];
  selectedDeviceId: string | null;
  onDeviceChange: (deviceId: string) => void;
  disabled?: boolean;
  isSwitching?: boolean;
  className?: string;
}

const deviceConfig: Record<DeviceType, { label: string; enabledIcon: typeof Video; disabledIcon: typeof Video }> = {
  videoinput: { label: 'Camera', enabledIcon: Video, disabledIcon: VideoOff },
  audioinput: { label: 'Microphone', enabledIcon: Mic, disabledIcon: MicOff },
  audiooutput: { label: 'Speaker', enabledIcon: Volume2, disabledIcon: Volume2 },
};

export function DeviceControlGroup({
  type,
  isEnabled = true,
  onToggle,
  devices,
  selectedDeviceId,
  onDeviceChange,
  disabled = false,
  isSwitching = false,
  className,
}: DeviceControlGroupProps) {
  const config = deviceConfig[type];
  const Icon = isEnabled ? config.enabledIcon : config.disabledIcon;
  const hasDevices = devices.length > 0;
  const isOutputDevice = type === 'audiooutput';

  const handleDeviceSelect = useCallback(
    (deviceId: string) => {
      if (deviceId !== selectedDeviceId) {
        onDeviceChange(deviceId);
      }
    },
    [onDeviceChange, selectedDeviceId]
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
              disabled={disabled || !hasDevices || isSwitching}
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

  return (
    <div className={cn('inline-flex rounded-lg border', className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onToggle}
        disabled={disabled || !hasDevices}
        className={cn(
          'rounded-r-none border-r px-3',
          !isEnabled && 'text-muted-foreground'
        )}
        title={isEnabled ? `Turn off ${config.label}` : `Turn on ${config.label}`}
      >
        <Icon className="size-5" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || !hasDevices || isSwitching}
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
    </div>
  );
}
