import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DevAuthProvider, useDevAuth } from "@/features/console/contexts/dev-auth.context";

const mockDevApi = vi.hoisted(() => ({
  getToken: vi.fn<() => string | null>(),
  setToken: vi.fn(),
  clearToken: vi.fn(),
  login: vi.fn<(username: string, password: string) => Promise<void>>(),
  register: vi.fn<(username: string, password: string) => Promise<void>>(),
}));

vi.mock("@/features/console/services/dev-api", () => ({
  devApi: mockDevApi,
}));

vi.mock("@/components/main-header", () => ({
  MainHeader: () => <header data-testid="main-header" />,
}));

function Probe({ onState }: { onState?: (state: { isAuthenticated: boolean }) => void }) {
  const { isAuthenticated } = useDevAuth();
  onState?.({ isAuthenticated });
  return (
    <div>
      <p data-testid="auth-state">{isAuthenticated ? "authenticated" : "anonymous"}</p>
    </div>
  );
}

function renderConsole(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DevAuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports anonymous when no token is stored", () => {
    mockDevApi.getToken.mockReturnValue(null);

    renderConsole(
      <DevAuthProvider>
        <Probe />
      </DevAuthProvider>,
    );

    expect(screen.getByTestId("auth-state")).toHaveTextContent("anonymous");
  });

  it("reports authenticated when a token is stored", () => {
    mockDevApi.getToken.mockReturnValue("dev-jwt");

    renderConsole(
      <DevAuthProvider>
        <Probe />
      </DevAuthProvider>,
    );

    expect(screen.getByTestId("auth-state")).toHaveTextContent("authenticated");
  });

  it("stores the token on login and clears it on logout", async () => {
    mockDevApi.getToken
      .mockReturnValueOnce(null)
      .mockReturnValueOnce("fresh-token")
      .mockReturnValue("fresh-token");

    function LoginProbe() {
      const { login, logout, isAuthenticated } = useDevAuth();
      return (
        <div>
          <p data-testid="auth-state">{isAuthenticated ? "authenticated" : "anonymous"}</p>
          <button type="button" onClick={() => void login("dev", "Password1")}>
            login
          </button>
          <button type="button" onClick={() => logout()}>
            logout
          </button>
        </div>
      );
    }

    renderConsole(
      <DevAuthProvider>
        <LoginProbe />
      </DevAuthProvider>,
    );

    expect(screen.getByTestId("auth-state")).toHaveTextContent("anonymous");

    fireEvent.click(screen.getByText("login"));
    expect(mockDevApi.login).toHaveBeenCalledWith("dev", "Password1");
    await waitFor(() =>
      expect(screen.getByTestId("auth-state")).toHaveTextContent("authenticated"),
    );
    fireEvent.click(screen.getByText("logout"));
    await waitFor(() => expect(screen.getByTestId("auth-state")).toHaveTextContent("anonymous"));
    expect(mockDevApi.clearToken).toHaveBeenCalled();
  });
});
