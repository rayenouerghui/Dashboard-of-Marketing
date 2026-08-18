"use client";

import { useAuth } from "@/context/AuthContext";
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";

export const dynamic = 'force-dynamic';
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import RecentOrders from "@/components/ecommerce/RecentOrders";
import DemographicCard from "@/components/ecommerce/DemographicCard";
import PipelineSummary from "@/components/dashboard/PipelineSummary";

export default function Dashboard() {
  const { role } = useAuth();

  const getWelcomeMessage = () => {
    switch (role) {
      case "admin":
        return "Welcome Admin";
      default:
        return "Welcome";
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-brand-500 to-brand-600 p-6 text-white shadow-lg dark:border-gray-700">
        <h1 className="text-3xl font-bold">{getWelcomeMessage()}</h1>
        <p className="mt-2 text-brand-100">
          {role === "admin" 
            ? "You have full access to all dashboard features and settings."
            : "Welcome to the AIESEC Operations Dashboard."}
        </p>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 space-y-6 xl:col-span-7">
          <EcommerceMetrics />
          <PipelineSummary />
          <MonthlySalesChart />
        </div>

        <div className="col-span-12 xl:col-span-5">
          <MonthlyTarget />
        </div>

        <div className="col-span-12">
          <StatisticsChart />
        </div>

        <div className="col-span-12 xl:col-span-5">
          <DemographicCard />
        </div>

        <div className="col-span-12 xl:col-span-7">
          <RecentOrders />
        </div>
      </div>
    </div>
  );
}
