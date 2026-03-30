import { Button } from '@/components/ui/button';
import { DeviceSettingsPanel } from '@/features/media/components/device-settings-panel';
import { APP_NAME } from '@/lib/config/app';
import { ROUTES } from '@/lib/config/routes';
import Logo from '@/assets/logo.svg?react';
import { Link } from 'react-router';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';
import { useRoomAudioContext } from '../contexts/room-audio.context';

interface Props {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isOwner: boolean;
  onEndRoom: () => void;
  isEndingRoom: boolean;
}

export function ActiveRoomHeader({ isVideoEnabled, isAudioEnabled, isOwner, onEndRoom, isEndingRoom }: Props) {
  const { audioElement } = useRoomAudioContext()

  return (
    <header className="border-b w-full flex h-16 items-center justify-between px-4">
      <Link to={ROUTES.HOME} className="flex items-center gap-2 text-primary">
        <Logo className="size-8" />
        <span className="text-lg font-semibold">{APP_NAME}</span>
      </Link>

      <div className="flex gap-4">
        <ThemeSwitcher />

        <div className="flex items-center gap-2">
          <DeviceSettingsPanel
            variant="popover"
            audioElement={audioElement}
            isVideoEnabled={isVideoEnabled}
            isAudioEnabled={isAudioEnabled}
          />
          {isOwner && (
            <Button
              variant="destructive"
              onClick={onEndRoom}
              disabled={isEndingRoom}
            >
              {isEndingRoom ? 'Ending...' : 'End Room'}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
