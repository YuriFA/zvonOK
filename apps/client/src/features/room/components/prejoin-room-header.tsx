import { Link } from "react-router";

import Logo from "@/assets/logo.svg?react";
import { CopyLink } from "@/components/ui/copy-link";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { APP_NAME } from "@/lib/config/app";
import { ROUTES } from "@/lib/config/routes";

interface Props {
  roomUrl: string;
}

export function PrejoinRoomHeader({ roomUrl }: Props) {
  return (
    <header className="flex h-16 w-full items-center justify-between border-b px-4">
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
