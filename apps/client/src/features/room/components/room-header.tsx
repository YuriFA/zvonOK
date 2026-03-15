import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { DeviceSettingsPanel } from '@/features/media/components/device-settings-panel';
import type { Room } from '@/features/room/types/room.types';

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
}

type RoomHeaderProps = RoomHeaderPrejoinProps | RoomHeaderActiveProps;

export function RoomHeader(props: RoomHeaderProps) {
  const { room } = props;

  return (
    <header className="border-b w-full flex h-16 items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-semibold">{room.name || 'Unnamed Room'}</h1>
          <p className="text-sm text-muted-foreground">Code: {room.slug}</p>
        </div>
      </div>

      {props.variant === 'active' && (
        <div className="flex items-center gap-2">
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
