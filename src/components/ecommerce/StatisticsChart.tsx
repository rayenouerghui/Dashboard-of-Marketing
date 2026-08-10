"use client";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { useState, useMemo } from "react";
import { getLeadSeriesMonthly, getLeadSeriesWeekly, getLeadSeriesDaily } from "@/lib/dataUtils";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Period = "monthly" | "weekly" | "daily";

// ── Period Tab Component ───────────────────────────────────────────────────────
function PeriodTab({ period, setPeriod }: { period: Period; setPeriod: (p: Period) => void }) {
  const btn = (label: string, val: Period) => (
    <button
      onClick={() => setPeriod(val)}
      className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900 dark:hover:text-white transition-colors ${
        period === val
          ? "shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800"
          : "text-gray-500 dark:text-gray-400"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
      {btn("Monthly", "monthly")}
      {btn("Weekly", "weekly")}
      {btn("Daily", "daily")}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function StatisticsChart() {
  const [period, setPeriod] = useState<Period>("monthly");

  const data = useMemo(() => {
    if (period === "monthly") return getLeadSeriesMonthly();
    if (period === "weekly") return getLeadSeriesWeekly();
    return getLeadSeriesDaily();
  }, [period]);

  const options: ApexOptions = {
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit, sans-serif",
    },
    colors: ["#465FFF", "#34D399"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "area",
      toolbar: { show: false },
      animations: { enabled: true, speed: 400 },
    },
    stroke: {
      curve: "smooth",
      width: [2, 2],
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.45,
        opacityTo: 0,
        type: "vertical",
      },
    },
    markers: {
      size: 0,
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: { size: 5 },
    },
    grid: {
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    dataLabels: { enabled: false },
    tooltip: {
      enabled: true,
      shared: true,
      intersect: false,
      y: {
        formatter: (val: number) => `${val} leads`,
      },
    },
    xaxis: {
      type: "category",
      categories: data.categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
      labels: {
        rotate: -30,
        style: { fontSize: "11px", colors: ["#6B7280"] },
        // Trim long labels on daily view
        formatter: (val: string) =>
          period === "daily"
            ? val.slice(5) // "MM-DD"
            : val,
      },
    },
    yaxis: {
      labels: {
        style: { fontSize: "12px", colors: ["#6B7280"] },
      },
      title: { text: "", style: { fontSize: "0px" } },
    },
  };

  const series = [
    { name: "Digital Leads", data: data.Digital },
    { name: "Physical Attraction", data: data.physical },
  ];

  const totalDigital = data.Digital.reduce((a, b) => a + b, 0);
  const totalPhysical = data.physical.reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Lead Acquisition
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Digital attraction leads vs Physical ones over time
          </p>

          {/* Summary pills */}
          <div className="flex gap-3 mt-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Digital: {totalDigital} leads
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Physical: {totalPhysical} leads
            </span>
          </div>
        </div>

        <div className="flex items-start sm:items-center gap-3 sm:justify-end">
          <PeriodTab period={period} setPeriod={setPeriod} />
        </div>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[640px] xl:min-w-full">
          <Chart options={options} series={series} type="area" height={310} />
        </div>
      </div>
    </div>
  );
}
