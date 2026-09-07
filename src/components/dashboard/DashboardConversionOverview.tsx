"use client";

import dynamic from "next/dynamic";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import type { ApexOptions } from "apexcharts";
import {
  ConversionRateCard,
  ApprovalRankingTable,
} from "@/components/dashboard/ConversionStats";
import type { ExpaLeadStats } from "@/app/api/expa/leads/route";
import { formatRate } from "@/data/stats";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

// ─────────────────────────────────────────────────────────────────────────────
// Shared constants & types
// ─────────────────────────────────────────────────────────────────────────────

const FONT_FAMILY = "Outfit, sans-serif";
const AXIS_LABEL_COLOR = "#6B7280";
const GRID_COLOR = "#E5E7EB";

/** Base chart settings shared by every ApexCharts instance on this page. */
const BASE_CHART_OPTIONS: ApexOptions = {
  chart: { toolbar: { show: false }, fontFamily: FONT_FAMILY },
  legend: { position: "top", horizontalAlign: "left", fontSize: "12px" },
  grid: {
    borderColor: GRID_COLOR,
    strokeDashArray: 4,
    xaxis: { lines: { show: false } },
  },
  tooltip: { shared: true, intersect: false },
  dataLabels: { enabled: false },
};

type RankingFilter = "all" | "physical" | "digital";

const RANKING_FILTERS: { key: RankingFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "physical", label: "Physical" },
  { key: "digital", label: "Digital" },
];

interface PipelineKpi {
  label: string;
  value: number;
  color: string;
}

/** Bar segment colors for the mini per-programme progress bar, keyed to KPI order. */
const PROGRAMME_BAR_SEGMENTS = [
  { key: "open", color: "bg-blue-400" },
  { key: "approved", color: "bg-emerald-400" },
  { key: "realized", color: "bg-violet-400" },
  { key: "rejected", color: "bg-red-400" },
  { key: "withdrawn", color: "bg-orange-300" },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Small presentational helpers
// ─────────────────────────────────────────────────────────────────────────────

function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
    >
      {children}
    </div>
  );
}

function KpiTile({ label, value, color }: PipelineKpi) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-3 dark:bg-white/[0.04]">
      <p className="text-[11px] text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${color}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function StatPill({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline KPI card
// ─────────────────────────────────────────────────────────────────────────────

function ConversionFunnelRow({
  label,
  from,
  to,
  rate,
  color,
}: {
  label: string;
  from: number;
  to: number;
  rate: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-7 w-14 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
            {label}
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {from.toLocaleString()} → {to.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className={color}>
            <strong>{formatRate(rate)}</strong>
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div className={`h-full rounded-full ${color.replace('text-', 'bg-')}`} style={{ width: `${rate}%` }} />
      </div>
    </div>
  );
}

function PipelineCard({ stats }: { stats: ExpaLeadStats }) {
  const kpis: PipelineKpi[] = [
    { label: "Unique EPs", value: stats.totalLeads, color: "text-gray-800 dark:text-white" },
    { label: "Applied", value: stats.applied, color: "text-blue-600 dark:text-blue-400" },
    { label: "Approved", value: stats.approved, color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Realized", value: stats.realized, color: "text-violet-600 dark:text-violet-400" },
  ];

  return (
    <SectionCard>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
            EXPA · Live Data
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-800 dark:text-white/90">
            Conversion Overview
          </h3>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {stats.totalLeads} unique EPs · approval {formatRate(stats.appliedToApproved)} · realization {formatRate(stats.approvedToRealized)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatPill label={`Approval ${formatRate(stats.appliedToApproved)}`} tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" />
          <StatPill label={`Realized ${formatRate(stats.approvedToRealized)}`} tone="bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300" />
        </div>
      </div>

      {/* KPI grid */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiTile key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* By Programme breakdown */}
      <div className="mt-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          By Programme
        </p>
        <div className="space-y-2">
          {Object.entries(stats.byProgramme).map(([prog, data]) => {
            const approvedRate = data.total > 0 ? (data.approved / data.total) * 100 : 0;
            const realizedRate = data.total > 0 ? (data.realized / data.total) * 100 : 0;
            
            return (
              <div key={prog} className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-7 w-14 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                      {prog}
                    </span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {data.total} EPs
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="text-blue-600 dark:text-blue-400">
                      Open: <strong>{data.total}</strong>
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Approved: <strong>{data.approved}</strong> ({approvedRate.toFixed(1)}%)
                    </span>
                    <span className="text-violet-600 dark:text-violet-400">
                      Realized: <strong>{data.realized}</strong> ({realizedRate.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conversion funnel */}
      <div className="mt-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Conversion Funnel
        </p>
        <div className="space-y-2">
          <ConversionFunnelRow
            label="Sign-up → Applied"
            from={stats.totalLeads}
            to={stats.applied}
            rate={stats.signupToApplied}
            color="text-blue-600 dark:text-blue-400"
          />
          <ConversionFunnelRow
            label="Sign-up → Approved"
            from={stats.totalLeads}
            to={stats.approved}
            rate={stats.totalLeads > 0 ? (stats.approved / stats.totalLeads) * 100 : 0}
            color="text-emerald-600 dark:text-emerald-400"
          />
          <ConversionFunnelRow
            label="Sign-up → Realized"
            from={stats.totalLeads}
            to={stats.realized}
            rate={stats.totalLeads > 0 ? (stats.realized / stats.totalLeads) * 100 : 0}
            color="text-violet-600 dark:text-violet-400"
          />
        </div>
      </div>
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Monthly trend chart
// ─────────────────────────────────────────────────────────────────────────────

const MONTHLY_TREND_START = "2026-02";

function MonthlyPipelineChart({ stats }: { stats: ExpaLeadStats }) {
  const monthly = stats.byMonth.filter((m) => m.key >= MONTHLY_TREND_START);

  const options: ApexOptions = {
    ...BASE_CHART_OPTIONS,
    chart: { ...BASE_CHART_OPTIONS.chart, type: "line", height: 350 },
    stroke: { curve: "smooth", width: [2, 2] },
    colors: ["#6B7280", "#34D399"],
    markers: { size: 3 },
    xaxis: {
      categories: monthly.map((m) => m.label),
      labels: { style: { colors: AXIS_LABEL_COLOR, fontSize: "11px" }, rotate: -30 },
    },
    yaxis: { labels: { style: { colors: AXIS_LABEL_COLOR } } },
  };

  const series = [
    { name: "Total Sign-ups", data: monthly.map((m) => m.count) },
    { name: "Applied", data: monthly.map((m) => Math.round(m.count * (stats.signupToApplied / 100))) },
  ];

  return (
    <SectionCard>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Monthly Sign-up Trend</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Total sign-ups and applied EPs per month ({MONTHLY_TREND_START} onwards).
      </p>
      <div className="mt-4">
        <Chart options={options} series={series} type="line" height={350} />
      </div>
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export function DashboardConversionOverview() {
  const [stats, setStats] = useState<ExpaLeadStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (nocache = false) => {
    setLoading(true);
    try {
      const url = `/api/expa/leads${nocache ? "?nocache=1" : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to load EXPA stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !stats) {
    return (
      <div className="col-span-12 flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="col-span-12 space-y-6">
      {/* EXPA conversion overview */}
      <PipelineCard stats={stats} />

      {/* Monthly trend */}
      <MonthlyPipelineChart stats={stats} />
    </div>
  );
}