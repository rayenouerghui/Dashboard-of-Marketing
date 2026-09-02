"use client";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { MoreDotIcon } from "@/icons";
import { useState } from "react";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { useAuth } from "@/context/AuthContext";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface DailyTargetProps {
  initialStats: {
    leadsToday: number;
    leadsThisWeek: number;
    leadsThisMonth: number;
  };
}

// ── Constants ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = "aiesec_daily_target";

function loadTarget(): number {
  if (typeof window === "undefined") return 5;
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? parseInt(saved, 10) : 5;
}

function saveTarget(val: number) {
  localStorage.setItem(STORAGE_KEY, String(val));
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function DailyTarget({ initialStats }: DailyTargetProps) {
  const { role } = useAuth();
  const canEditGoal = role === "admin";

  // Admin-configurable daily target
  const [dailyTarget, setDailyTarget] = useState<number>(() => loadTarget());
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState<string>(String(dailyTarget));
  const [isOpen, setIsOpen] = useState(false);

  const leadsToday = initialStats.leadsToday;
  const leadsThisWeek = initialStats.leadsThisWeek;
  const leadsThisMonth = initialStats.leadsThisMonth;

  // Progress = how many daily leads vs target
  const progressPercent = Math.min(
    dailyTarget > 0 ? Math.round((leadsToday / dailyTarget) * 100) : 0,
    100
  );

  const options: ApexOptions = {
    colors: ["#10B981"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "radialBar",
      height: 280,
      sparkline: { enabled: true },
    },
    plotOptions: {
      radialBar: {
        startAngle: -85,
        endAngle: 85,
        hollow: { size: "80%" },
        track: {
          background: "#E4E7EC",
          strokeWidth: "100%",
          margin: 5,
        },
        dataLabels: {
          name: { show: false },
          value: {
            fontSize: "32px",
            fontWeight: "600",
            offsetY: -35,
            color: "#1D2939",
            formatter: (val: number) => `${val}%`,
          },
        },
      },
    },
    fill: { type: "solid", colors: ["#10B981"] },
    stroke: { lineCap: "round" },
    labels: ["Progress"],
  };

  function handleSaveTarget() {
    const parsed = parseInt(inputVal, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setDailyTarget(parsed);
      saveTarget(parsed);
    }
    setEditing(false);
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="px-5 pt-5 bg-white shadow-default rounded-2xl pb-9 dark:bg-gray-900 sm:px-6 sm:pt-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Daily Lead Target
            </h3>
            <p className="mt-1 font-normal text-gray-500 text-theme-sm dark:text-gray-400">
              Leads collected today vs target
            </p>
          </div>
          {canEditGoal && (
            <div className="relative inline-block">
              <button onClick={() => setIsOpen(!isOpen)} className="dropdown-toggle">
                <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
              </button>
              <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)} className="w-48 p-2">
                <DropdownItem
                  onItemClick={() => { setEditing(true); setInputVal(String(dailyTarget)); setIsOpen(false); }}
                  className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                >
                  ✏️ Set Daily Target
                </DropdownItem>
              </Dropdown>
            </div>
          )}
        </div>

        {/* Inline target editor */}
        {canEditGoal && editing && (
          <div className="mt-4 flex items-center gap-2">
            <label className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
              Target leads / day:
            </label>
            <input
              type="number"
              min={1}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-brand-500"
              onKeyDown={(e) => e.key === "Enter" && handleSaveTarget()}
              autoFocus
            />
            <button
              onClick={handleSaveTarget}
              className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        )}

        {!canEditGoal && (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-white/60 px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-400">
            Daily attraction goal is managed by the Admin.
          </div>
        )}

        {/* Gauge */}
        <div className="relative">
          <div className="max-h-[280px]">
            <ReactApexChart
              options={options}
              series={[progressPercent]}
              type="radialBar"
              height={280}
            />
          </div>
          <span
            className={`absolute left-1/2 top-full -translate-x-1/2 -translate-y-[90%] rounded-full px-3 py-1 text-xs font-medium
              ${progressPercent >= 100
                ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500"
                : progressPercent >= 50
                ? "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500"
                : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500"
              }`}
          >
            {leadsToday} / {dailyTarget} leads
          </span>
        </div>

        <p className="mx-auto mt-8 w-full max-w-[380px] text-center text-sm text-gray-500 sm:text-base">
          {progressPercent >= 100
            ? "🎉 Daily target achieved! Great work today!"
            : progressPercent >= 75
            ? `Almost there! ${dailyTarget - leadsToday} more lead${dailyTarget - leadsToday !== 1 ? "s" : ""} to hit your daily goal.`
            : `You've reached ${progressPercent}% of today's target. Keep pushing!`}
        </p>
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-center gap-5 px-6 py-3.5 sm:gap-8 sm:py-5">
        <div>
          <p className="mb-1 text-center text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">
            Daily Target
          </p>
          <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
            {dailyTarget}
            <span className="text-xs font-normal text-gray-500"> leads</span>
          </p>
        </div>

        <div className="w-px bg-gray-200 h-7 dark:bg-gray-800" />

        <div>
          <p className="mb-1 text-center text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">
            This Week
          </p>
          <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
            {leadsThisWeek}
            <span className="text-xs font-normal text-gray-500"> leads</span>
          </p>
        </div>

        <div className="w-px bg-gray-200 h-7 dark:bg-gray-800" />

        <div>
          <p className="mb-1 text-center text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">
            This Month
          </p>
          <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
            {leadsThisMonth}
            <span className="text-xs font-normal text-gray-500"> leads</span>
          </p>
        </div>
      </div>
    </div>
  );
}
