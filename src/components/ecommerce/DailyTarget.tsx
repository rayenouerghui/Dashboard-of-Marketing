"use client";
import type { ExpaLeadStats } from "@/app/api/expa/leads/route";

function currentMonthName() {
  return new Date().toLocaleString("en-GB", { month: "long" });
}

export default function DailyTarget({ stats }: { stats: ExpaLeadStats }) {
  const monthName = currentMonthName();
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="rounded-2xl bg-white p-5 shadow-default dark:bg-gray-900 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Today's Leads</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Sign-ups today from EXPA, with {monthName} total below.
        </p>

        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Sign-ups today</p>
          <p className="mt-2 text-4xl font-bold text-emerald-900 dark:text-emerald-100 tabular-nums">
            {stats.leadsToday}
          </p>
          <p className="mt-2 text-sm text-emerald-700/80 dark:text-emerald-200/80">
            {stats.leadsThisWeek} this week
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">{monthName}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{stats.leadsThisMonth}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">sign-ups this month</p>
        </div>
      </div>
    </div>
  );
}
