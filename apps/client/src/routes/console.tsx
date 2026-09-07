import { useEffect } from "react";
import { Link, Navigate, Outlet } from "react-router";

import { MainHeader } from "@/components/main-header";
import { DevAuthProvider, useDevAuth } from "@/features/console/contexts/dev-auth.context";
import { ROUTES } from "@/lib/config/routes";

function ConsoleLayoutInner() {
  const { isAuthenticated, isLoading, logout } = useDevAuth();

  // A failed request means the short-lived token expired: clear it so the
  // guard shows the login again.
  useEffect(() => {
    const onAuthFailure = () => logout();
    window.addEventListener("zvonok:dev-auth-expired", onAuthFailure);
    return () => window.removeEventListener("zvonok:dev-auth-expired", onAuthFailure);
  }, [logout]);

  if (isLoading) {
    return (
      <div className="flex min-h-dscreen flex-col">
        <MainHeader />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Loading console...</p>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.CONSOLE_LOGIN} replace />;
  }

  return (
    <div className="flex min-h-dscreen flex-col bg-background">
      <MainHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 p-4">
        <Outlet />
      </main>
      <footer className="border-t p-4 text-center text-xs text-muted-foreground">
        Signed in as developer.{" "}
        <button type="button" className="underline underline-offset-4" onClick={logout}>
          Sign out
        </button>{" "}
        -{" "}
        <Link to={ROUTES.HOME} className="underline underline-offset-4">
          back to app
        </Link>
      </footer>
    </div>
  );
}

export function ConsoleLayout() {
  return (
    <DevAuthProvider>
      <ConsoleLayoutInner />
    </DevAuthProvider>
  );
}
