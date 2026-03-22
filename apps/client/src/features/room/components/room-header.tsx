import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeviceSettingsPanel } from '@/features/media/components/device-settings-panel';
import { PermissionWarningIndicator } from '@/features/room/components/permission-warning-indicator';
import type { Room } from '@/features/room/types/room.types';
import { LinkButton } from '@/components/ui/link-button';

interface RoomHeaderPrejoinProps {
  variant: 'prejoin';
  room: Room;
}

interface RoomHeaderActiveProps {
  variant: 'active';
  room: Room;
  primaryRemoteMediaElement: HTMLVideoElement | null;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isOwner: boolean;
  onEndRoom: () => void;
  isEndingRoom: boolean;
  isCameraDenied: boolean;
  isMicrophoneDenied: boolean;
  onPermissionWarningClick: () => void;
}

type RoomHeaderProps = RoomHeaderPrejoinProps | RoomHeaderActiveProps;

export function RoomHeader(props: RoomHeaderProps) {
  const { room } = props;

  return (
    <header className="border-b w-full flex h-16 items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <LinkButton to="/" variant="ghost" size="icon">
          <ArrowLeft className="size-4" />
        </LinkButton>
        <div>
          <h1 className="text-lg font-semibold">{room.name || 'Unnamed Room'}</h1>
          <p className="text-sm text-muted-foreground">Code: {room.slug}</p>
        </div>
      </div>

      {props.variant === 'active' && (
        <div className="flex items-center gap-2">
          <PermissionWarningIndicator
            isCameraDenied={props.isCameraDenied}
            isMicrophoneDenied={props.isMicrophoneDenied}
            onClick={props.onPermissionWarningClick}
          />
          <DeviceSettingsPanel
            variant="popover"
            remoteVideoElement={props.primaryRemoteMediaElement}
            isVideoEnabled={props.isVideoEnabled}
            isAudioEnabled={props.isAudioEnabled}
          />
          {props.isOwner && (
            <Button
              variant="destructive"
              onClick={props.onEndRoom}
              disabled={props.isEndingRoom}
            >
              {props.isEndingRoom ? 'Ending...' : 'End Room'}
            </Button>
          )}
        </div>
      )}
    </header>
  );
}
