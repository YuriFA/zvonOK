import { CopyLink } from '@/components/ui/copy-link';
import { APP_NAME } from '@/lib/config/app';
import { ROUTES } from '@/lib/config/routes';
import Logo from '@/assets/logo.svg?react';
import { Link } from 'react-router';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';

interface Props {
  roomUrl: string;
}

export function PrejoinRoomHeader({ roomUrl }: Props) {
  return (
    <header className="border-b w-full flex h-16 items-center justify-between px-4">
      <Link to={ROUTES.HOME} className="flex items-center gap-2 text-primary">
        <Logo className="size-8" />
        <span className="text-lg font-semibold">{APP_NAME}</span>
      </Link>

      <div className="flex gap-4">
        <ThemeSwitcher />
        <CopyLink url={roomUrl} variant="compact" />
      </div>
    </header>
  );
}
