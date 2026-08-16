"use client";

import dynamic from "next/dynamic";
import React, { useMemo, useState } from "react";
import type { ApexOptions } from "apexcharts";
import {
  ConversionRateCard,
  ApprovalRankingTable,
} from "@/components/dashboard/ConversionStats";
import {
  getDigitalConversionStats,
  getDigitalReferralRankings,
  getGlobalConversionStats,
  getPhysicalConversionStats,
  getPhysicalMemberRankings,
  getPipelineStats,
  getPipelineByProgramme,
  getPipelineByMonth,
  formatRate,
} from "@/data/stats";

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

function ProgrammeRow({
  programme,
}: {
  programme: ReturnType<typeof getPipelineByProgramme>[number];
}) {
  const { total, open, approved, realized, rejected, withdrawn } = programme;

  const pct = (count: number) => (total > 0 ? (count / total) * 100 : 0);
  const approvedPct = pct(approved);
  const realizedPct = pct(realized);

  const counts = { open, approved, realized, rejected, withdrawn };

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-7 w-14 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
            {programme.programme}
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {total.toLocaleString()} applications
          </span>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="text-blue-600 dark:text-blue-400">
            Open: <strong>{open}</strong>
          </span>
          <span className="text-emerald-600 dark:text-emerald-400">
            Approved: <strong>{approved}</strong> ({formatRate(approvedPct)})
          </span>
          <span className="text-violet-600 dark:text-violet-400">
            Realized: <strong>{realized}</strong> ({formatRate(realizedPct)})
          </span>
          <span className="text-red-500 dark:text-red-400">
            Rejected: <strong>{rejected}</strong>
          </span>
          <span className="text-orange-500 dark:text-orange-400">
            Withdrawn: <strong>{withdrawn}</strong>
          </span>
        </div>
      </div>

      {/* Mini progress bar: proportion of each status within the programme */}
      <div className="mt-2.5 flex gap-0.5 h-1.5 rounded-full overflow-hidden">
        {PROGRAMME_BAR_SEGMENTS.map(({ key, color }) => (
          <div key={key} className={color} style={{ width: `${pct(counts[key as keyof typeof counts])}%` }} />
        ))}
      </div>
    </div>
  );
}

function PipelineCard() {
  const pipeline = getPipelineStats();
  const byProgramme = getPipelineByProgramme();

  const kpis: PipelineKpi[] = [
    { label: "Total Applications", value: pipeline.total, color: "text-gray-800 dark:text-white" },
    { label: "Open / Active", value: pipeline.open, color: "text-blue-600 dark:text-blue-400" },
    { label: "Approved", value: pipeline.approved, color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Realized / Completed", value: pipeline.realized, color: "text-violet-600 dark:text-violet-400" },
    { label: "Rejected", value: pipeline.rejected, color: "text-red-500 dark:text-red-400" },
    { label: "Withdrawn", value: pipeline.withdrawn, color: "text-orange-500 dark:text-orange-400" },
  ];

  return (
    <SectionCard>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
            EXPA Application Pipeline
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-800 dark:text-white/90">
            Live Applications Overview
          </h3>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            All {pipeline.total.toLocaleString()} applications from the latest export
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatPill label={`Approval ${formatRate(pipeline.approvalRate)}`} tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" />
          <StatPill label={`Realized ${formatRate(pipeline.realizationRate)}`} tone="bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300" />
          <StatPill label={`Drop ${formatRate(pipeline.dropRate)}`} tone="bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" />
        </div>
      </div>

      {/* KPI grid */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((kpi) => (
          <KpiTile key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Per-programme breakdown */}
      <div className="mt-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          By Programme
        </p>
        <div className="space-y-2">
          {byProgramme.map((programme) => (
            <ProgrammeRow key={programme.programme} programme={programme} />
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Monthly trend chart
// ─────────────────────────────────────────────────────────────────────────────

const MONTHLY_TREND_START = "2026-02";

function MonthlyPipelineChart() {
  const monthly = getPipelineByMonth().filter((m) => m.month >= MONTHLY_TREND_START);

  const options: ApexOptions = {
    ...BASE_CHART_OPTIONS,
    chart: { ...BASE_CHART_OPTIONS.chart, type: "line", height: 350 },
    stroke: { curve: "smooth", width: [2, 2, 2] },
    colors: ["#6B7280", "#34D399", "#8B5CF6"],
    markers: { size: 3 },
    xaxis: {
      categories: monthly.map((m) => m.month),
      labels: { style: { colors: AXIS_LABEL_COLOR, fontSize: "11px" }, rotate: -30 },
    },
    yaxis: { labels: { style: { colors: AXIS_LABEL_COLOR } } },
  };

  const series = [
    { name: "Total", data: monthly.map((m) => m.total) },
    { name: "Approved", data: monthly.map((m) => m.approved) },
    { name: "Unique Applicants", data: monthly.map((m) => m.uniqueApplicants) },
  ];

  return (
    <SectionCard>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Monthly Pipeline Trend</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Total applications, approvals and unique applicants per month ({MONTHLY_TREND_START} onwards).
      </p>
      <div className="mt-4">
        <Chart options={options} series={series} type="line" height={350} />
      </div>
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Signup channel comparison chart
// ─────────────────────────────────────────────────────────────────────────────

function ChannelComparisonChart({
  digital,
  physical,
  overall,
}: {
  digital: ReturnType<typeof getDigitalConversionStats>;
  physical: ReturnType<typeof getPhysicalConversionStats>;
  overall: ReturnType<typeof getGlobalConversionStats>;
}) {
  const options: ApexOptions = {
    ...BASE_CHART_OPTIONS,
    chart: { ...BASE_CHART_OPTIONS.chart, type: "bar", height: 320 },
    plotOptions: { bar: { horizontal: false, columnWidth: "45%", borderRadius: 8 } },
    colors: ["#465FFF", "#34D399"],
    xaxis: {
      categories: ["Digital", "Physical", "Overall"],
      labels: { style: { colors: [AXIS_LABEL_COLOR], fontSize: "12px" } },
    },
    yaxis: { max: 100, labels: { formatter: (v) => `${v.toFixed(0)}%` } },
    fill: { opacity: 1 },
    tooltip: { ...BASE_CHART_OPTIONS.tooltip, y: { formatter: (v: number) => `${v.toFixed(1)}%` } },
    grid: { ...BASE_CHART_OPTIONS.grid, yaxis: { lines: { show: true } } },
  };

  const series = [
    { name: "Application Rate", data: [digital.applicationRate, physical.applicationRate, overall.applicationRate] },
    { name: "Approval Rate", data: [digital.conversionRate, physical.conversionRate, overall.conversionRate] },
  ];

  return (
    <SectionCard>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Signup Conversion by Channel</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Application vs approval rate across digital, physical and combined signups.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatPill label={`Digital ${digital.conversionRate.toFixed(1)}%`} tone="bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" />
          <StatPill label={`Physical ${physical.conversionRate.toFixed(1)}%`} tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" />
          <StatPill label={`Overall ${overall.conversionRate.toFixed(1)}%`} tone="bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300" />
        </div>
      </div>
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[640px]">
          <Chart options={options} series={series} type="bar" height={320} />
        </div>
      </div>
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Top performers table
// ─────────────────────────────────────────────────────────────────────────────

function TopPerformersTable({
  physicalRankings,
  digitalRankings,
}: {
  physicalRankings: ReturnType<typeof getPhysicalMemberRankings>;
  digitalRankings: ReturnType<typeof getDigitalReferralRankings>;
}) {
  const [activeFilter, setActiveFilter] = useState<RankingFilter>("all");

  const physicalTable = (
    <ApprovalRankingTable
      title="Physical Attraction"
      subtitle="Members ranked by approved applications"
      groupLabel="Member"
      rankings={physicalRankings}
      emptyMessage="No physical attraction approvals recorded yet."
    />
  );

  const digitalTable = (
    <ApprovalRankingTable
      title="Digital Attraction"
      subtitle="Referral sources ranked by approved applications"
      groupLabel="Referral"
      rankings={digitalRankings}
      emptyMessage="No digital attraction approvals recorded yet."
    />
  );

  return (
    <SectionCard>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Top Performers — Approved EPs</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Compare results by attraction type.</p>
        </div>
        <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
          {RANKING_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveFilter(key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                activeFilter === key
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeFilter === "all" && (
        <div className="grid gap-5 xl:grid-cols-2">
          {physicalTable}
          {digitalTable}
        </div>
      )}
      {activeFilter === "physical" && physicalTable}
      {activeFilter === "digital" && digitalTable}
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export function DashboardConversionOverview() {
  const globalStats = useMemo(() => getGlobalConversionStats(), []);
  const digitalStats = useMemo(() => getDigitalConversionStats(), []);
  const physicalStats = useMemo(() => getPhysicalConversionStats(), []);
  const physicalRankings = useMemo(() => getPhysicalMemberRankings(10), []);
  const digitalRankings = useMemo(() => getDigitalReferralRankings(10), []);

  return (
    <div className="col-span-12 space-y-6">
      {/* Signup-level conversion (physical + digital signups) */}
      <ConversionRateCard
        title="EP Conversion Rate (Signups)"
        subtitle="Based on Physical + Digital signup forms — Approved? = Yes"
        stats={globalStats}
      />

      {/* EXPA application pipeline (new CSV) */}
      <PipelineCard />

      {/* Monthly trend */}
      <MonthlyPipelineChart />

      {/* Signup channel comparison */}
      <ChannelComparisonChart digital={digitalStats} physical={physicalStats} overall={globalStats} />

      {/* Top performers */}
      <TopPerformersTable physicalRankings={physicalRankings} digitalRankings={digitalRankings} />
    </div>
  );
}