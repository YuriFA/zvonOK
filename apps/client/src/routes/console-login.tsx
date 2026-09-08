import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import { MainHeader } from "@/components/main-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/contexts/auth.context";
import { DevAuthProvider, useDevAuth } from "@/features/console/contexts/dev-auth.context";
import { devApi } from "@/features/console/services/dev-api";
import { ROUTES } from "@/lib/config/routes";

function ConsoleLoginPageInner() {
  const { login, register } = useDevAuth();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ssoPending, setSsoPending] = useState(false);

  const continueAs = async () => {
    setSsoPending(true);
    try {
      await devApi.ssoLogin();
      navigate(ROUTES.CONSOLE, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign-in failed");
    } finally {
      setSsoPending(false);
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(username, password);
      }
      navigate(ROUTES.CONSOLE, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dscreen flex-col">
      <MainHeader />
      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Developer console</CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Sign in with your developer account"
                : "Create a developer account to get API keys"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAuthenticated && user && (
              <div
                className="rounded-lg border border-primary/30 bg-primary/5 p-3"
                data-testid="sso-continue"
              >
                <p className="text-sm text-muted-foreground">
                  Signed in on the site as{" "}
                  <span className="font-medium text-foreground">{user.username}</span>
                </p>
                <Button
                  className="mt-2 w-full"
                  onClick={() => void continueAs()}
                  disabled={ssoPending}
                >
                  {ssoPending ? "Signing in..." : `Continue as ${user.username}`}
                </Button>
              </div>
            )}
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dev-username">Username</Label>
                <Input
                  id="dev-username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dev-password">Password</Label>
                <Input
                  id="dev-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                />
                {mode === "register" && (
                  <p className="text-xs text-muted-foreground">
                    Min 6 characters with an uppercase, a lowercase and a number.
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "..." : mode === "login" ? "Sign in" : "Create account"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <>
                  No account?{" "}
                  <button
                    type="button"
                    className="text-primary underline-offset-4 hover:underline"
                    onClick={() => setMode("register")}
                  >
                    Register
                  </button>
                </>
              ) : (
                <>
                  Already registered?{" "}
                  <button
                    type="button"
                    className="text-primary underline-offset-4 hover:underline"
                    onClick={() => setMode("login")}
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
            <p className="mt-2 text-center text-sm">
              <Link to={ROUTES.HOME} className="text-muted-foreground hover:underline">
                Back to app
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

// Self-contained: the route is rendered outside ConsoleLayout, so the page
// brings its own DevAuthProvider.
export function ConsoleLoginPage() {
  return (
    <DevAuthProvider>
      <ConsoleLoginPageInner />
    </DevAuthProvider>
  );
}
