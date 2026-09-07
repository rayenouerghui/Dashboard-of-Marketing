"use client";

import { useAuth } from "@/context/AuthContext";
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import DailyTarget from "@/components/ecommerce/DailyTarget";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import RecentOrders from "@/components/ecommerce/RecentOrders";
import type { ExpaLeadStats } from "@/app/api/expa/leads/route";
import { useState, useEffect, useCallback } from "react";

// ─── Empty stats placeholder shown while loading ──────────────────────────────
const EMPTY: ExpaLeadStats = {
  totalLeads: 0, leadsToday: 0, leadsThisWeek: 0, leadsThisMonth: 0,
  applied: 0, approved: 0, realized: 0,
  signupToApplied: 0, appliedToApproved: 0, approvedToRealized: 0,
  byProgramme: {}, byMonth: [], recent: [], computedAt: "",
};

export default function DashboardClient() {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [stats, setStats]       = useState<ExpaLeadStats>(EMPTY);
  const [loading, setLoading]   = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async (nocache = false) => {
    try {
      const url = `/api/expa/leads${nocache ? "?nocache=1" : ""}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setLastRefresh(new Date());
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => load(), 120000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-brand-500 to-brand-600 p-6 text-white shadow-lg dark:border-gray-700">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold">{isAdmin ? "Welcome Admin" : "Welcome"}</h1>
            <p className="mt-2 text-brand-100">
              {isAdmin
                ? "You have full access to all dashboard features and settings."
                : "Welcome to the AIESEC Operations Dashboard."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => load(true)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50 transition-colors"
            >
              <span className={`h-4 w-4 border-2 border-current rounded-full ${loading ? "border-t-transparent animate-spin" : ""}`} />
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <div className="text-sm text-white/80">
              {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : "Loading…"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 space-y-6 xl:col-span-7">
          <EcommerceMetrics stats={stats} loading={loading} />
          <MonthlySalesChart stats={stats} />
        </div>
        <div className="col-span-12 space-y-6 xl:col-span-5">
          <DailyTarget stats={stats} />
          <MonthlyTarget stats={stats} />
        </div>
        <div className="col-span-12">
          <StatisticsChart stats={stats} />
        </div>
        <div className="col-span-12">
          <RecentOrders stats={stats} loading={loading} />
        </div>
      </div>
    </div>
  );
}
