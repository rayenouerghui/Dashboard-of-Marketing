"use client";

import React from "react";
import { DashboardConversionOverview } from "@/components/dashboard/DashboardConversionOverview";
import { useAuth } from "@/context/AuthContext";
import { 
  getGlobalConversionStats, 
  getDigitalConversionStats, 
  getPhysicalConversionStats,
  getPhysicalMemberRankings,
  getDigitalReferralRankings,
  getPipelineStats,
  getPipelineByProgramme,
  getPipelineByMonth
} from "@/data/stats";

export default function ConversionRatePage() {
  const { role } = useAuth();

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        // Handle nested objects and arrays
        if (typeof value === 'object' && value !== null) {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = String(value ?? '');
        if (stringValue.includes(',') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAllData = () => {
    const globalStats = getGlobalConversionStats();
    const digitalStats = getDigitalConversionStats();
    const physicalStats = getPhysicalConversionStats();
    const physicalRankings = getPhysicalMemberRankings();
    const digitalRankings = getDigitalReferralRankings();
    const pipelineStats = getPipelineStats();
    const pipelineByProgramme = getPipelineByProgramme();
    const pipelineByMonth = getPipelineByMonth();

    // Export each dataset
    exportToCSV([{
      total: globalStats.total,
      approved: globalStats.approved,
      applied: globalStats.applied,
      rejected: globalStats.rejected,
      noApplication: globalStats.noApplication,
      conversionRate: globalStats.conversionRate,
      applicationRate: globalStats.applicationRate
    }], 'global_conversion_stats');

    exportToCSV([{
      total: digitalStats.total,
      approved: digitalStats.approved,
      applied: digitalStats.applied,
      rejected: digitalStats.rejected,
      noApplication: digitalStats.noApplication,
      conversionRate: digitalStats.conversionRate,
      applicationRate: digitalStats.applicationRate
    }], 'digital_conversion_stats');

    exportToCSV([{
      total: physicalStats.total,
      approved: physicalStats.approved,
      applied: physicalStats.applied,
      rejected: physicalStats.rejected,
      noApplication: physicalStats.noApplication,
      conversionRate: physicalStats.conversionRate,
      applicationRate: physicalStats.applicationRate
    }], 'physical_conversion_stats');

    exportToCSV(physicalRankings, 'physical_member_rankings');
    exportToCSV(digitalRankings, 'digital_referral_rankings');
    
    exportToCSV([{
      total: pipelineStats.total,
      uniqueEPs: pipelineStats.uniqueEPs,
      open: pipelineStats.open,
      approved: pipelineStats.approved,
      realized: pipelineStats.realized,
      rejected: pipelineStats.rejected,
      withdrawn: pipelineStats.withdrawn,
      approvalRate: pipelineStats.approvalRate,
      realizationRate: pipelineStats.realizationRate,
      totalLeads: pipelineStats.totalLeads
    }], 'pipeline_stats');

    exportToCSV(pipelineByProgramme, 'pipeline_by_programme');
    exportToCSV(pipelineByMonth, 'pipeline_by_month');
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-500 dark:text-brand-400">
              Analytics
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
              Conversion Rate
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Overall approval and application performance across all signups.
            </p>
          </div>
          {role === "admin" && (
            <button
              onClick={exportAllData}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export All Data
            </button>
          )}
        </div>
      </div>

      <DashboardConversionOverview />
    </div>
  );
}
