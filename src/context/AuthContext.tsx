"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppRole = "admin";

interface AuthContextValue {
  role:           AppRole | null;
  hydrated:       boolean;
  login:          (username: string, password: string) => Promise<boolean>;
  logout:         () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<AppRole | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Check session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setRole(data.role);
          }
        }
      } catch (error) {
        console.error("[AuthContext] Failed to check session:", error);
      } finally {
        setHydrated(true);
      }
    }
    checkSession();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      
      if (data.success) {
        setRole(data.role);
        return true;
      }
      return false;
    } catch (error) {
      console.error("[AuthContext] Login failed:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setRole(null);
    } catch (error) {
      console.error("[AuthContext] Logout failed:", error);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({ role, hydrated, login, logout }),
    [role, hydrated],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
