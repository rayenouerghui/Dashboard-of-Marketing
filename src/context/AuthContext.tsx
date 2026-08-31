"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppRole = "member" | "admin";

interface AuthContextValue {
  role: AppRole;
  setRole: (role: AppRole) => void;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

// Session-only key: elevated role lasts only for the current browser tab session.
// On every fresh page load the user always starts as "member".
const SESSION_KEY = "aiesec-session-role";

const defaultRole: AppRole = "member";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // SSR + first render always "member" — no flash of elevated content
  const [role, setRoleState] = useState<AppRole>(defaultRole);

  useEffect(() => {
    // Restore from sessionStorage (cleared when tab/window is closed).
    // This means after closing and reopening the browser the user is always
    // back as "member", even if they were logged in before.
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved === "admin") {
      setRoleState(saved);
    }
    // If nothing saved (or "member"), stay as member — no elevation on revisit.
  }, []);

  useEffect(() => {
    if (role === "member") {
      // Explicitly clear any saved session when the user is a member
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY, role);
    }
  }, [role]);

  const setRole = (nextRole: AppRole) => {
    console.log("AuthContext setRole called:", nextRole);
    setRoleState(nextRole);
  };

  const login = (username: string, password: string) => {
    const u = username.trim().toLowerCase();
    const p = password.trim().toLowerCase();

    if (u === "crispy" && p === "crispy") {
      setRoleState("admin");
      return true;
    }

    return false;
  };

  // Logout always resets to member and clears session
  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setRoleState(defaultRole);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ role, setRole, login, logout }),
    [role],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
