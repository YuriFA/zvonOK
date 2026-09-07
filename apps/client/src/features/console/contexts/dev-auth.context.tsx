import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { devApi } from "../services/dev-api";

interface DevAuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const DevAuthContext = createContext<DevAuthContextValue | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export function useDevAuth() {
  const context = useContext(DevAuthContext);
  if (!context) {
    throw new Error("useDevAuth must be used within DevAuthProvider");
  }
  return context;
}

interface DevAuthProviderProps {
  children: ReactNode;
}

export function DevAuthProvider({ children }: DevAuthProviderProps) {
  const [token, setToken] = useState<string | null>(() => devApi.getToken());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // The token is short-lived (minutes). Reading it synchronously is all the
    // bootstrapping there is; there is no refresh flow for dev tokens.
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    await devApi.login(username, password);
    setToken(devApi.getToken());
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    await devApi.register(username, password);
    setToken(devApi.getToken());
  }, []);

  const logout = useCallback(() => {
    devApi.clearToken();
    setToken(null);
  }, []);

  const value = useMemo<DevAuthContextValue>(
    () => ({
      isAuthenticated: !!token,
      isLoading,
      login,
      register,
      logout,
    }),
    [token, isLoading, login, register, logout],
  );

  return <DevAuthContext.Provider value={value}>{children}</DevAuthContext.Provider>;
}
