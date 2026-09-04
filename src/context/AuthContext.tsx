"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppRole = "member" | "admin";

interface AuthContextValue {
  role:           AppRole;
  hydrated:       boolean; // true once sessionStorage has been read
  login:          (username: string, password: string) => boolean;
  logout:         () => void;
  switchToMember: () => void; // drop to member without clearing session permanently
}

const SESSION_KEY  = "aiesec-session-role";
const defaultRole: AppRole = "member";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<AppRole>(defaultRole);
  const [hydrated, setHydrated] = useState(false);

  // Read saved role from sessionStorage on first mount
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved === "admin") setRoleState("admin");
    setHydrated(true);
  }, []);

  // Persist role changes
  useEffect(() => {
    if (!hydrated) return;
    if (role === "member") {
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY, role);
    }
  }, [role, hydrated]);

  const login = (username: string, password: string): boolean => {
    const u = username.trim().toLowerCase();
    const p = password.trim();
    const adminUser = (process.env.NEXT_PUBLIC_ADMIN_USER ?? "crispy").toLowerCase();
    const adminPass =  process.env.NEXT_PUBLIC_ADMIN_PASS ?? "crispy";
    if (u === adminUser && p === adminPass) {
      setRoleState("admin");
      return true;
    }
    return false;
  };

  /** Full logout — clears session, goes back to member */
  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setRoleState("member");
  };

  /**
   * Switch to member view WITHOUT clearing the admin session.
   * This lets the admin browse the member side and click the logo
   * 5× to get back — or just open a new tab for the admin dashboard.
   * We intentionally clear the session here so the member layout
   * guard doesn't immediately bounce them back to /dashboard.
   */
  const switchToMember = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setRoleState("member");
  };

  const value = useMemo<AuthContextValue>(
    () => ({ role, hydrated, login, logout, switchToMember }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [role, hydrated],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
