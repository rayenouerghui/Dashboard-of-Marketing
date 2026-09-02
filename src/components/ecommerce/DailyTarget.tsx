"use client";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { MoreDotIcon } from "@/icons";
import { useState } from "react";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { useAuth } from "@/context/AuthContext";

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

  const progressPercent = Math.min(
    dailyTarget > 0 ? Math.round((leadsToday / dailyTarget) * 100) : 0,
    100
  );

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
              Leads achieved today
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

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Leads achieved today</p>
            <p className="mt-2 text-4xl font-bold text-emerald-900 dark:text-emerald-100">{leadsToday}</p>
            <p className="mt-2 text-sm text-emerald-700/80 dark:text-emerald-200/80">
              {dailyTarget > 0 ? `${progressPercent}% of today's target (${dailyTarget})` : "No target set"}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/50">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Context</p>
            <div className="mt-3 space-y-3 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center justify-between">
                <span>This Week</span>
                <span className="font-semibold text-gray-800 dark:text-white/90">{leadsThisWeek} leads</span>
              </div>
              <div className="flex items-center justify-between">
                <span>This Month</span>
                <span className="font-semibold text-gray-800 dark:text-white/90">{leadsThisMonth} leads</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Daily Target</span>
                <span className="font-semibold text-gray-800 dark:text-white/90">{dailyTarget} leads</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
