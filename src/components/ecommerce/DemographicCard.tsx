"use client";
import { useState } from "react";
import { MoreDotIcon } from "@/icons";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { getTopUniversities } from "@/lib/dataUtils";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function DemographicCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"Digital" | "physical" | "total">("total");

  const universities = getTopUniversities(10);

  const data =
    mode === "Digital"
      ? universities.map((u) => u.Digital)
      : mode === "physical"
      ? universities.map((u) => u.physical)
      : universities.map((u) => u.total);

  const maxVal = Math.max(...data, 1);

  const categories = universities.map((u) => u.shortName);

  const options: ApexOptions = {
    chart: {
      type: "bar",
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false },
      animations: { enabled: true, speed: 400 },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        barHeight: "65%",
      },
    },
    colors: [mode === "Digital" ? "#465FFF" : mode === "physical" ? "#34D399" : "#A78BFA"],
    dataLabels: { enabled: false },
    xaxis: {
      categories,
      labels: {
        style: { fontSize: "11px", colors: "#6B7280" },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { fontSize: "11px", colors: "#6B7280" },
        maxWidth: 160,
      },
    },
    grid: {
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
    },
    tooltip: {
      y: { formatter: (val: number) => `${val} leads` },
    },
  };

  const series = [
    {
      name: mode === "Digital" ? "Digital Leads" : mode === "physical" ? "Physical Attraction" : "Total Leads",
      data,
    },
  ];

  const totalLeads = universities.reduce((s, u) => s + u.total, 0);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            University Distribution
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Top 10 universities by lead count
          </p>
        </div>
        <div className="relative inline-block">
          <button onClick={() => setIsOpen(!isOpen)} className="dropdown-toggle">
            <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
          </button>
          <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)} className="w-48 p-2">
            <DropdownItem
              onItemClick={() => { setMode("total"); setIsOpen(false); }}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              🟣 Show Total
            </DropdownItem>
            <DropdownItem
              onItemClick={() => { setMode("Digital"); setIsOpen(false); }}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              🔵 Show Digital Only
            </DropdownItem>
            <DropdownItem
              onItemClick={() => { setMode("physical"); setIsOpen(false); }}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              🟢 Show Physical Only
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 mt-3">
        {(["total", "Digital", "physical"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              mode === m
                ? m === "Digital"
                  ? "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400"
                  : m === "physical"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                  : "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400"
                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {m === "total" ? "All" : m === "Digital" ? "Digital" : "Physical"}
          </button>
        ))}
      </div>

      {/* Bar chart */}
      <div className="mt-4 -mx-1">
        <ReactApexChart options={options} series={series} type="bar" height={260} />
      </div>

      {/* Footer: top 3 universities ranked */}
      <div className="mt-2 space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
        {universities.slice(0, 3).map((u, idx) => {
          const val = mode === "Digital" ? u.Digital : mode === "physical" ? u.physical : u.total;
          const pct = Math.round((val / totalLeads) * 100);
          return (
            <div key={u.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white ${
                    idx === 0 ? "bg-brand-500" : idx === 1 ? "bg-indigo-400" : "bg-indigo-300"
                  }`}
                >
                  {idx + 1}
                </span>
                <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90 truncate max-w-[160px]">
                  {u.shortName}
                </p>
              </div>
              <div className="flex items-center gap-3 w-36">
                <div className="relative block h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className={`absolute left-0 top-0 h-full rounded-full ${
                      idx === 0 ? "bg-brand-500" : idx === 1 ? "bg-indigo-400" : "bg-indigo-300"
                    }`}
                    style={{ width: `${Math.round((val / maxVal) * 100)}%` }}
                  />
                </div>
                <p className="text-theme-sm font-semibold text-gray-700 dark:text-gray-300 w-16 text-right">
                  {val} <span className="text-xs font-normal text-gray-400">({pct}%)</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
