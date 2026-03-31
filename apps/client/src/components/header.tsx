import type { PropsWithChildren } from "react";
import { Link } from "react-router";

import Logo from "@/assets/logo.svg?react";
import { APP_NAME } from "@/lib/config/app";
import { ROUTES } from "@/lib/config/routes";

import { ThemeSwitcher } from "./ui/theme-switcher";

export const Header = ({ children }: PropsWithChildren) => {
  return (
    <header className="flex h-16 w-full items-center justify-between border-b px-4">
      <Link to={ROUTES.HOME} className="flex items-center gap-2 text-primary">
        <Logo className="size-8" />
        <span className="text-lg font-semibold">{APP_NAME}</span>
      </Link>

      <div className="flex gap-4">
        <ThemeSwitcher />
        {children}
      </div>
    </header>
  );
};
