import { Link } from 'react-router';
import { LinkButton } from '@/components/ui/link-button';
import { useAuth } from '../contexts/auth.context';
import { ProfileDropdown } from './profile-dropdown';
import { ROUTES } from '@/lib/config/routes';
import { APP_NAME } from '@/lib/config/app';
import Logo from '@/assets/logo.svg?react';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';

export function AuthHeader() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between px-4 border-b">
      <Link to={ROUTES.HOME} className="flex items-center gap-2 text-primary">
        <Logo className="size-8" />
        <span className="text-lg font-semibold">{APP_NAME}</span>
      </Link>

      <div className="flex gap-4">
        <ThemeSwitcher />

        {isLoading ? <p>Loading...</p> : isAuthenticated ? (
          <ProfileDropdown />
        ) : (
          <div className="flex gap-2">
            <LinkButton to={ROUTES.LOGIN} variant="ghost">
              Sign in
            </LinkButton>
          </div>
        )}
      </div>
    </header>
  );
}
