"use client";

interface MonthlyTargetProps {
  initialStats: {
    leadsThisWeek: number;
    leadsThisMonth: number;
    totalLeads: number;
    totalEPs: number;
    leadsToday: number;
  };
}

export default function MonthlyTarget({ initialStats }: MonthlyTargetProps) {
  const leadsThisWeek = initialStats.leadsThisWeek;
  const leadsThisMonth = initialStats.leadsThisMonth;
  const totalEPs = initialStats.totalEPs;

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="rounded-2xl bg-white p-5 shadow-default dark:bg-gray-900 sm:p-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            This Week's Leads
          </h3>
          <p className="mt-1 text-sm font-normal text-gray-500 dark:text-gray-400">
            Leads achieved this week, month, and overall.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-500/20 dark:bg-brand-500/10">
          <p className="text-sm font-medium text-brand-700 dark:text-brand-300">
            Leads achieved this week
          </p>
          <p className="mt-2 text-4xl font-bold text-brand-900 dark:text-brand-100">
            {leadsThisWeek}
          </p>
          <p className="mt-2 text-sm text-brand-700/80 dark:text-brand-200/80">
            This week's total activity
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
              This Month
            </p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {leadsThisMonth}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">leads achieved</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
              Total EPs
            </p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {totalEPs}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">overall leads</p>
          </div>
        </div>
      </div>
    </div>
  );
}