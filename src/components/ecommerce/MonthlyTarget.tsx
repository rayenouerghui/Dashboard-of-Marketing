"use client";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { MoreDotIcon } from "@/icons";
import { useState } from "react";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { useAuth } from "@/context/AuthContext";

interface MonthlyTargetProps {
  initialStats: {
    leadsThisWeek: number;
    leadsThisMonth: number;
    totalLeads: number;
    totalEPs: number;
    leadsToday: number;
  };
}

// ── Constants ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = "aiesec_weekly_target";

function loadTarget(): number {
  if (typeof window === "undefined") return 20;
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? parseInt(saved, 10) : 20;
}

function saveTarget(val: number) {
  localStorage.setItem(STORAGE_KEY, String(val));
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function MonthlyTarget({ initialStats }: MonthlyTargetProps) {
  const { role } = useAuth();
  const canEditGoal = role === "admin";

  // Admin-configurable weekly target
  const [weeklyTarget, setWeeklyTarget] = useState<number>(() => loadTarget());
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState<string>(String(weeklyTarget));
  const [isOpen, setIsOpen] = useState(false);

  const leadsThisWeek = initialStats.leadsThisWeek;
  const leadsThisMonth = initialStats.leadsThisMonth;
  const totalEPs = initialStats.totalEPs;

  const progressPercent = Math.min(
    weeklyTarget > 0 ? Math.round((leadsThisWeek / weeklyTarget) * 100) : 0,
    100
  );

  function handleSaveTarget() {
    const parsed = parseInt(inputVal, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setWeeklyTarget(parsed);
      saveTarget(parsed);
    }
    setEditing(false);
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="px-5 pt-5 bg-white shadow-default rounded-2xl pb-11 dark:bg-gray-900 sm:px-6 sm:pt-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Weekly Lead Target
            </h3>
            <p className="mt-1 font-normal text-gray-500 text-theme-sm dark:text-gray-400">
              Leads achieved this week
            </p>
          </div>
          {canEditGoal && (
            <div className="relative inline-block">
              <button onClick={() => setIsOpen(!isOpen)} className="dropdown-toggle">
                <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
              </button>
              <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)} className="w-48 p-2">
                <DropdownItem
                  onItemClick={() => { setEditing(true); setInputVal(String(weeklyTarget)); setIsOpen(false); }}
                  className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                >
                  ✏️ Set Weekly Target
                </DropdownItem>
              </Dropdown>
            </div>
          )}
        </div>

        {/* Inline target editor */}
        {canEditGoal && editing && (
          <div className="mt-4 flex items-center gap-2">
            <label className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
              Target leads / week:
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
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-500/20 dark:bg-brand-500/10">
            <p className="text-sm font-medium text-brand-700 dark:text-brand-300">Leads achieved this week</p>
            <p className="mt-2 text-4xl font-bold text-brand-900 dark:text-brand-100">{leadsThisWeek}</p>
            <p className="mt-2 text-sm text-brand-700/80 dark:text-brand-200/80">
              {weeklyTarget > 0 ? `${progressPercent}% of weekly target (${weeklyTarget})` : "No target set"}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/50">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Context</p>
            <div className="mt-3 space-y-3 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center justify-between">
                <span>This Month</span>
                <span className="font-semibold text-gray-800 dark:text-white/90">{leadsThisMonth} leads</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total EPs</span>
                <span className="font-semibold text-gray-800 dark:text-white/90">{totalEPs} leads</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Weekly Target</span>
                <span className="font-semibold text-gray-800 dark:text-white/90">{weeklyTarget} leads</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
