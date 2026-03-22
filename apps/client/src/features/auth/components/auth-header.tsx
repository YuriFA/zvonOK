import { Link } from 'react-router';
import { LinkButton } from '@/components/ui/link-button';
import { useAuth } from '../contexts/auth.context';
import { ProfileDropdown } from './profile-dropdown';

export function AuthHeader() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between px-4 border-b">
      <Link to="/" className="text-lg font-semibold">
        Video Chat
      </Link>

      {isLoading ? <p>Loading...</p> : isAuthenticated ? (
        <ProfileDropdown />
      ) : (
        <div className="flex gap-2">
          <LinkButton to="/login" variant="ghost">
            Login
          </LinkButton>
          <LinkButton to="/register">
            Register
          </LinkButton>
        </div>
      )}
    </header>
  );
}
