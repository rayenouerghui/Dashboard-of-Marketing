"use client";

import { useAuth } from "@/context/AuthContext";
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import RecentOrders from "@/components/ecommerce/RecentOrders";
import DemographicCard from "@/components/ecommerce/DemographicCard";
import PipelineSummary from "@/components/dashboard/PipelineSummary";
import type { DashboardStats, SeriesResult, TopUniversityRow } from "@/lib/dataUtilsServer";

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

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-brand-500 to-brand-600 p-6 text-white shadow-lg dark:border-gray-700">
        <h1 className="text-3xl font-bold">{isAdmin ? "Welcome Admin" : "Welcome"}</h1>
        <p className="mt-2 text-brand-100">
          {isAdmin
            ? "You have full access to all dashboard features and settings."
            : "Welcome to the AIESEC Operations Dashboard."}
        </p>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 space-y-6 xl:col-span-7">
          <EcommerceMetrics initialStats={initialStats} />
          <PipelineSummary />
          <MonthlySalesChart initialStats={initialStats} />
        </div>
        <div className="col-span-12 xl:col-span-5">
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
