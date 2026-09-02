"use client";
import React from "react";
import Badge from "../ui/badge/Badge";
import { ArrowDownIcon, ArrowUpIcon, BoxIconLine, GroupIcon, UserCircleIcon, CheckCircleIcon } from "@/icons";

interface EcommerceMetricsProps {
  initialStats: Awaited<ReturnType<typeof import('@/lib/dataUtilsServer').getDashboardStats>>;
}

export const EcommerceMetrics = ({ initialStats }: EcommerceMetricsProps) => {
  const stats = initialStats;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      {/* <!-- Total EPs --> */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl dark:bg-blue-900/20">
          <GroupIcon className="text-blue-600 size-6 dark:text-blue-400" />
        </div>

        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total EPs
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {stats.totalEPs}
            </h4>
          </div>
          <Badge color="success">
            <ArrowUpIcon />
            All
          </Badge>
        </div>
      </div>

      {/* <!-- Digital Attractions --> */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl dark:bg-green-900/20">
          <CheckCircleIcon className="text-green-600 size-6 dark:text-green-400" />
        </div>

        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Digital Attractions
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {stats.digitalAttractions}%
            </h4>
          </div>
          <Badge color="success">
            {stats.totalLeads} leads
          </Badge>
        </div>
      </div>

      {/* <!-- Physical Attractions --> */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl dark:bg-purple-900/20">
          <UserCircleIcon className="text-purple-600 size-6 dark:text-purple-400" />
        </div>

        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Physical Attractions
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {stats.physicalAttractions}%
            </h4>
          </div>
          <Badge color="success">
            {stats.totalPhysicalLeads} leads
          </Badge>
        </div>
      </div>

      {/* <!-- Universities --> */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-xl dark:bg-orange-900/20">
          <BoxIconLine className="text-orange-600 size-6 dark:text-orange-400" />
        </div>

        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Universities
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {stats.totalUniversities}
            </h4>
          </div>
          <Badge color="success">
            <ArrowUpIcon />
            Active
          </Badge>
        </div>
      </div>
    </div>
  );
};
