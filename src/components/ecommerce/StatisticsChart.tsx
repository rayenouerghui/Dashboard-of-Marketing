"use client";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { useMemo } from "react";
import type { ExpaLeadStats } from "@/app/api/expa/leads/route";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

function pct(n: number) { return `${n.toFixed(1)}%`; }

export default function StatisticsChart({ stats }: { stats: ExpaLeadStats }) {
  const { totalLeads, applied, approved, realized,
          signupToApplied, appliedToApproved, approvedToRealized } = stats;

  const funnelData = useMemo(() => [
    { label: "Sign-Ups",  value: totalLeads, color: "#465FFF" },
    { label: "Applied",   value: applied,    color: "#34D399" },
    { label: "Approved",  value: approved,   color: "#A78BFA" },
    { label: "Realized",  value: realized,   color: "#F59E0B" },
  ], [totalLeads, applied, approved, realized]);

  const max = Math.max(...funnelData.map((d) => d.value), 1);

  const options: ApexOptions = {
    chart: { type: "bar", fontFamily: "Outfit, sans-serif", toolbar: { show: false }, animations: { enabled: true, speed: 400 } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: "60%" } },
    colors: funnelData.map((d) => d.color),
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val.toLocaleString(),
      style: { fontSize: "12px", fontFamily: "Outfit, sans-serif" },
    },
    xaxis: {
      categories: funnelData.map((d) => d.label),
      labels: { style: { fontSize: "12px", colors: "#6B7280" } },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: { labels: { style: { fontSize: "13px", colors: "#374151" }, maxWidth: 90 } },
    grid: { xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    tooltip: { y: { formatter: (v: number) => v.toLocaleString() } },
  };

  const series = [{
    name: "People",
    data: funnelData.map((d) => d.value),
  }];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Conversion Funnel</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Sign-Up → Applied → Approved → Realized (from EXPA, Feb 2026 →)
          </p>
        </div>
        {/* Rate pills */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            Sign-up → Applied: <strong>{pct(signupToApplied)}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-400">
            Applied → Approved: <strong>{pct(appliedToApproved)}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            Approved → Realized: <strong>{pct(approvedToRealized)}</strong>
          </span>
        </div>
      </div>

      {/* Horizontal bar chart */}
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[400px]">
          {totalLeads > 0 ? (
            <Chart options={options} series={series} type="bar" height={220} />
          ) : (
            <div className="flex h-44 items-center justify-center text-sm text-gray-400">Loading data…</div>
          )}
        </div>
      </div>

      {/* Funnel progress bars */}
      <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
        {funnelData.map((step) => (
          <div key={step.label} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">{step.label}</span>
            <div className="flex-1 overflow-hidden rounded-full bg-gray-100 h-2 dark:bg-gray-800">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.round((step.value / max) * 100)}%`, backgroundColor: step.color }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-sm font-bold tabular-nums text-gray-700 dark:text-gray-300">
              {step.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
