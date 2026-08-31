"use client";

import { getAllPhysicalMembers } from "@/data/stats";
import { useEffect, useMemo, useState } from "react";

export default function MemberRankingClient() {
  const allMembers = useMemo(() => getAllPhysicalMembers(), []);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Sort by leads descending and take top 6 members
  const sortedMembers = useMemo(() => {
    return [...allMembers]
      .sort((a, b) => b.totalSignups - a.totalSignups)
      .slice(0, 6)
      .map((member, idx) => ({ ...member, rank: idx + 1 }));
  }, [allMembers]);

  const topThree = sortedMembers.slice(0, 3);
  const restMembers = sortedMembers.slice(3);

  const getRankColor = (rank: number) => {
    if (rank === 1) return "from-orange-500 via-amber-400 to-yellow-300";
    if (rank === 2) return "from-slate-300 to-slate-400";
    if (rank === 3) return "from-emerald-400 to-green-500";
    return "from-gray-300 to-gray-400";
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20";
    if (rank === 2) return "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/20 dark:to-slate-800/20";
    if (rank === 3) return "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20";
    return "bg-gray-50 dark:bg-gray-900/20";
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-white/90">
          Overall Leaderboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Top 6 members by total leads attracted
        </p>
      </div>

      {/* Top 3 Cards */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {topThree.map((member, i) => (
            <div
              key={member.name}
              className={`relative rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-md transition-all duration-500 ease-out hover:shadow-lg dark:border-gray-800 ${getRankBg(
                member.rank
              )} ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              {member.rank === 1 && (
                <div className="absolute -top-2 -right-2 text-2xl sm:text-3xl animate-bounce">⭐</div>
              )}

              <div className="flex flex-row items-center gap-3 text-left sm:flex-col sm:items-center sm:text-center sm:gap-0">
                <div
                  className={`h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-full bg-gradient-to-br ${getRankColor(
                    member.rank
                  )} flex items-center justify-center text-white font-bold shadow-lg sm:mb-3`}
                >
                  {member.rank}
                </div>

                <div className="min-w-0 flex-1 sm:flex sm:flex-col sm:items-center">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 sm:mb-2">
                    TOP {member.rank}
                  </p>

                  <h3 className="truncate font-semibold text-gray-800 dark:text-white sm:mb-1 sm:line-clamp-2 text-sm">
                    {member.name}
                  </h3>
                </div>

                <p
                  className={`shrink-0 text-xl sm:text-2xl font-bold bg-gradient-to-r ${getRankColor(
                    member.rank
                  )} bg-clip-text text-transparent`}
                >
                  {member.totalSignups}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Podium — desktop/tablet only, purely decorative */}
      {topThree.length > 0 && (
        <div className="hidden sm:flex items-end justify-center gap-4 h-24 mb-6">
          {topThree[1] && (
            <div className="flex flex-col items-center">
              <div className="h-16 bg-gradient-to-br from-slate-300 to-slate-400 rounded-t-lg w-16 flex items-center justify-center text-white font-bold text-lg shadow-md">
                2
              </div>
            </div>
          )}

          {topThree[0] && (
            <div className="flex flex-col items-center mb-4">
              <div className="h-28 bg-gradient-to-br from-orange-500 via-amber-400 to-yellow-300 rounded-t-lg w-20 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                1
              </div>
            </div>
          )}

          {topThree[2] && (
            <div className="flex flex-col items-center">
              <div className="h-12 bg-gradient-to-br from-emerald-400 to-green-500 rounded-t-lg w-16 flex items-center justify-center text-white font-bold text-lg shadow-md">
                3
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rest of Members List */}
      {restMembers.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="space-y-2 sm:space-y-3">
            {restMembers.map((member, i) => (
              <div
                key={member.name}
                className={`flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2.5 sm:px-4 sm:py-3 transition-all duration-500 ease-out hover:-translate-y-0.5 hover:bg-gray-100 hover:shadow-md dark:bg-gray-800/50 dark:hover:bg-gray-800 ${
                  mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                }`}
                style={{ transitionDelay: `${250 + i * 60}ms` }}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                  <span className="w-5 sm:w-6 shrink-0 text-center font-semibold text-gray-700 dark:text-gray-300">
                    {member.rank}
                  </span>
                  <div className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs sm:text-sm font-semibold">
                    {member.name.charAt(0)}
                  </div>
                  <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">
                    {member.name}
                  </span>
                </div>
                <span className="shrink-0 text-sm font-bold text-orange-500 dark:text-orange-400">
                  {member.totalSignups}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
