"use client";

import { useAuth } from "@/context/AuthContext";
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import DailyTarget from "@/components/ecommerce/DailyTarget";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import RecentOrders from "@/components/ecommerce/RecentOrders";
import DemographicCard from "@/components/ecommerce/DemographicCard";
import PipelineSummary from "@/components/dashboard/PipelineSummary";
import type { DashboardStats, SeriesResult, TopUniversityRow } from "@/lib/dataUtilsServer";
import { useState, useEffect } from "react";

interface DashboardClientProps {
  initialStats: DashboardStats;
  initialMonthly: SeriesResult;
  initialWeekly: SeriesResult;
  initialDaily: SeriesResult;
  initialUniversities: TopUniversityRow[];
}

export default function DashboardClient({
  initialStats,
  initialMonthly,
  initialWeekly,
  initialDaily,
  initialUniversities,
}: DashboardClientProps) {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Initialize timestamp on client only to avoid hydration mismatch
  useEffect(() => {
    setLastRefresh(new Date());
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        setLastRefresh(new Date());
        // In a real app, you would refetch data here
        // For now, we just update the timestamp
      }, 60000); // Refresh every 60 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-brand-500 to-brand-600 p-6 text-white shadow-lg dark:border-gray-700">
        <div className="flex justify-between items-start">
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
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                autoRefresh
                  ? 'border-white/30 bg-white/10 text-white hover:bg-white/20'
                  : 'border-white/30 bg-transparent text-white/80 hover:bg-white/10'
              }`}
            >
              <span className={`w-4 h-4 border-2 border-current rounded-full ${autoRefresh ? 'border-t-transparent animate-spin' : ''}`} />
              Auto-refresh
            </button>
            <div className="text-sm text-white/80">
              Last updated: {lastRefresh ? lastRefresh.toLocaleTimeString() : 'Loading...'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 space-y-6 xl:col-span-7">
          <EcommerceMetrics initialStats={initialStats} />
          <PipelineSummary />
          <MonthlySalesChart initialStats={initialStats} />
        </div>
        <div className="col-span-12 space-y-6 xl:col-span-5">
          <DailyTarget initialStats={initialStats} />
          <MonthlyTarget initialStats={initialStats} />
        </div>
        <div className="col-span-12">
          <StatisticsChart initialMonthly={initialMonthly} initialWeekly={initialWeekly} initialDaily={initialDaily} />
        </div>
        <div className="col-span-12 xl:col-span-5">
          <DemographicCard initialUniversities={initialUniversities} />
        </div>
        <div className="col-span-12 xl:col-span-7">
          <RecentOrders initialStats={initialStats} />
        </div>
      </div>
    </div>
  );
}
