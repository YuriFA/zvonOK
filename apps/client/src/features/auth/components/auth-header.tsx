import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/auth.context';
import { ProfileDropdown } from './profile-dropdown';

export function AuthHeader() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="text-lg font-semibold">Video Chat</div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link to="/" className="text-lg font-semibold">
          Video Chat
        </Link>

        {isAuthenticated ? (
          <ProfileDropdown />
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Register</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
