"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser, UserRole } from "@/lib/auth/auth.types";
import {
  me as apiMe,
  logout as apiLogout,
  refreshAccessToken as apiRefreshAccessToken,
} from "@/lib/auth/authApi";
import { getAccessToken } from "@/lib/auth/tokenStore";

type AuthStatus = "loading" | "authenticated" | "anonymous" | "error";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  errorMessage: string | null;
}

interface AuthContextValue extends AuthState {
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: readonly UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isUnauthorizedMessage(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("unauthorized") || m.includes("401");
}

function hasRole(user: AuthUser | null, role: UserRole): boolean {
  return !!user && user.role === role;
}

function hasAnyRole(user: AuthUser | null, roles: readonly UserRole[]): boolean {
  return !!user && roles.includes(user.role);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
    errorMessage: null,
  });

  const refresh = useCallback(async () => {
    if (!getAccessToken()) {
      try {
        await apiRefreshAccessToken();
      } catch {
        setState({ status: "anonymous", user: null, errorMessage: null });
        return;
      }
    }

    setState((s) => ({ ...s, status: "loading", errorMessage: null }));

    try {
      const res = await apiMe();
      setState({ status: "authenticated", user: res.user, errorMessage: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Auth check failed";
      if (isUnauthorizedMessage(message)) {
        try {
          await apiRefreshAccessToken();
          const res = await apiMe();
          setState({ status: "authenticated", user: res.user, errorMessage: null });
          return;
        } catch {
          setState({ status: "anonymous", user: null, errorMessage: null });
          return;
        }
      }
      setState({ status: "error", user: null, errorMessage: message });
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setState({ status: "anonymous", user: null, errorMessage: null });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(() => {
    return {
      ...state,
      refresh,
      logout,
      hasRole: (role: UserRole) => hasRole(state.user, role),
      hasAnyRole: (roles: readonly UserRole[]) => hasAnyRole(state.user, roles),
    };
  }, [state, refresh, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}
