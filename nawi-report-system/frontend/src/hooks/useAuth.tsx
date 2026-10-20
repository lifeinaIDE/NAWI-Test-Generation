/**
 * AuthContext — stores the current authenticated user and JWT.
 * Per Phase 2 specification: token is kept IN MEMORY only (not localStorage).
 */
import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User, Role } from "../types";
import { tokenStore, authApi } from "../api";

export interface DecodedUserPayload {
  sub: string;
  role: Role;
  name: string;
  exp?: number;
}

interface AuthContextValue {
  token: string | null;
  user: User | null;
  decodedUser: DecodedUserPayload | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeJwtPayload(token: string): DecodedUserPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => tokenStore.get());
  const [user, setUser] = useState<User | null>(null);
  const [decodedUser, setDecodedUser] = useState<DecodedUserPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const currentToken = tokenStore.get();
    if (currentToken) {
      setToken(currentToken);
      const decoded = decodeJwtPayload(currentToken);
      setDecodedUser(decoded);
      authApi.me()
        .then((u) => setUser(u))
        .catch(() => {
          tokenStore.clear();
          setToken(null);
          setUser(null);
          setDecodedUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  async function login(username: string, password: string) {
    const res = await authApi.login({ username, password });
    tokenStore.set(res.token);
    setToken(res.token);

    const decoded = decodeJwtPayload(res.token);
    setDecodedUser(decoded);

    const userObj: User = {
      id: res.user.userId || res.user.id || decoded?.sub || "",
      userId: res.user.userId || res.user.id || decoded?.sub || "",
      username: res.user.username,
      displayName: res.user.displayName || decoded?.name || res.user.username,
      role: (res.user.role || decoded?.role || "VIEWER") as Role,
      active: res.user.active ?? true,
      laboratory: res.user.laboratory || "Central Legal Metrology Laboratory",
    };
    setUser(userObj);
  }

  function logout() {
    tokenStore.clear();
    setToken(null);
    setUser(null);
    setDecodedUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        decodedUser,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
