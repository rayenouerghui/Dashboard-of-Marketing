"use client";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import type { ExpaLeadStats } from "@/app/api/expa/leads/route";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function MonthlySalesChart({ stats }: { stats: ExpaLeadStats }) {
  const categories = stats.byMonth.map((m) => m.label);
  const data       = stats.byMonth.map((m) => m.count);

  const options: ApexOptions = {
    colors: ["#465fff"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 180,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: { horizontal: false, columnWidth: "39%", borderRadius: 5, borderRadiusApplication: "end" },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 4, colors: ["transparent"] },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: "11px", colors: "#6B7280" } },
    },
    yaxis: { labels: { style: { fontSize: "11px", colors: "#6B7280" } } },
    grid: { yaxis: { lines: { show: true } } },
    fill: { opacity: 1 },
    tooltip: { x: { show: false }, y: { formatter: (v: number) => `${v} sign-ups` } },
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Monthly Sign-Ups</h3>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">EXPA registrations by month (Feb 2026 →)</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
          {stats.totalLeads.toLocaleString()} total
        </span>
      </div>
      <div className="max-w-full overflow-x-auto">
        <div className="-ml-5 min-w-[500px] xl:min-w-full pl-2">
          {categories.length > 0 ? (
            <ReactApexChart options={options} series={[{ name: "Sign-Ups", data }]} type="bar" height={180} />
          ) : (
            <div className="flex items-center justify-center h-44 text-sm text-gray-400">No data yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
