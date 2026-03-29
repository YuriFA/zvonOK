import { Button } from '@/components/ui/button';
import { CopyLink } from '@/components/ui/copy-link';
import { DeviceSettingsPanel } from '@/features/media/components/device-settings-panel';
import type { Room } from '@/features/room/types/room.types';
import { APP_NAME } from '@/lib/config/app';
import { ROUTES } from '@/lib/config/routes';
import Logo from '@/assets/logo.svg?react';
import { Link } from 'react-router';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';

interface RoomHeaderPrejoinProps {
  variant: 'prejoin';
  room: Room;
  roomUrl: string;
}

interface RoomHeaderActiveProps {
  variant: 'active';
  room: Room;
  audioElement: HTMLAudioElement | null;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isOwner: boolean;
  onEndRoom: () => void;
  isEndingRoom: boolean;
}

type RoomHeaderProps = RoomHeaderPrejoinProps | RoomHeaderActiveProps;

export function RoomHeader(props: RoomHeaderProps) {
  return (
    <header className="border-b w-full flex h-16 items-center justify-between px-4">
      <Link to={ROUTES.HOME} className="flex items-center gap-2 text-primary">
        <Logo className="size-8" />
        <span className="text-lg font-semibold">{APP_NAME}</span>
      </Link>

      <div className="flex gap-4">
        <ThemeSwitcher />

        {props.variant === 'prejoin' && (
          <CopyLink url={props.roomUrl} variant="compact" />
        )}

        {props.variant === 'active' && (
          <div className="flex items-center gap-2">
            <DeviceSettingsPanel
              variant="popover"
              audioElement={props.audioElement}
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
      </div>
    </header>
  );
}
