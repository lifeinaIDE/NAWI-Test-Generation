/**
 * AuthContext — stores the current user and JWT.
 * Token is persisted to localStorage so the session survives page refresh.
 */
import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User } from "../types";
import { tokenStore, authApi } from "../api";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on first mount
  useEffect(() => {
    const token = tokenStore.get();
    if (token) {
      authApi.me()
        .then((u) => setUser(u))
        .catch(() => tokenStore.clear())
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  async function login(username: string, password: string) {
    const res = await authApi.login({ username, password });
    tokenStore.set(res.token);
    setUser(res.user);
  }

  function logout() {
    tokenStore.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
