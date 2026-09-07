import { Header } from "@/components/header";
import { LinkButton } from "@/components/ui/link-button";
import { ROUTES } from "@/lib/config/routes";

import { ProfileDropdown } from "../features/auth/components/profile-dropdown";
import { useAuth } from "../features/auth/contexts/auth.context";

export function MainHeader() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Header>
      {isLoading ? (
        <p>Loading...</p>
      ) : isAuthenticated ? (
        <div className="flex items-center gap-2">
          <LinkButton to={ROUTES.HISTORY} variant="ghost">
            History
          </LinkButton>
          <ProfileDropdown />
        </div>
      ) : (
        <div className="flex gap-2">
          <LinkButton to={ROUTES.LOGIN} variant="ghost">
            Sign in
          </LinkButton>
        </div>
      )}
    </Header>
  );
}
