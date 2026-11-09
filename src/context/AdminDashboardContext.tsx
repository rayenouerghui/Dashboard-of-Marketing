"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AdminDashboardPayload } from "@/app/api/admin-dashboard/route";

// The admin dashboard data is large and slow-changing (EXPA pipeline statuses
// move over hours, not minutes). Fetch it once and re-check every 6 hours.
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 h

interface AdminDashboardValue {
  data:    AdminDashboardPayload | null;
  loading: boolean;
  error:   string | null;
  refresh: (nocache?: boolean) => Promise<void>;
}

const AdminDashboardContext = createContext<AdminDashboardValue | undefined>(undefined);

export function AdminDashboardProvider({ children }: { children: React.ReactNode }) {
  const [data, setData]       = useState<AdminDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const refresh = useCallback(async (nocache = false) => {
    try {
      setLoading(true);
      setError(null);
      const res  = await fetch(`/api/admin-dashboard${nocache ? "?nocache=1" : ""}`);
      const json = await res.json();

      if (!res.ok || !json?.success) {
        // Keep any previously loaded figures on screen; just surface the error.
        setError(json?.error ?? "EXPA data unavailable (token expired or service down)");
        return;
      }

      setData(json as AdminDashboardPayload);
      setError(null);
    } catch {
      setError("EXPA data unavailable (token expired or service down)");
    } finally {
      setLoading(false);
    }
  }, []);

  // One fetch on mount — this is the "Welcome Admin" load that fills every page.
  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const interval = setInterval(() => refresh(), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const value = useMemo<AdminDashboardValue>(
    () => ({ data, loading, error, refresh }),
    [data, loading, error, refresh],
  );

  return <AdminDashboardContext.Provider value={value}>{children}</AdminDashboardContext.Provider>;
}

export function useAdminDashboard() {
  const ctx = useContext(AdminDashboardContext);
  if (!ctx) throw new Error("useAdminDashboard must be used inside AdminDashboardProvider");
  return ctx;
}
