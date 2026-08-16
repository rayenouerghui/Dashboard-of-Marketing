"use client";

import Link from "next/link";
import { getPhysicalAttractionLeads } from "@/lib/dataUtils";
import { useEffect, useMemo, useState } from "react";

const ANIMAL_AVATARS = ["🦊", "🐼", "🦁", "🐨", "🐯", "🐰", "🦉", "🐺", "🐸", "🐻"];

export default function MemberDashboardPage() {
  const leads = useMemo(() => getPhysicalAttractionLeads(), []);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const todaysLeads = leads.filter((lead) => {
    const today = new Date().toISOString().slice(0, 10);
    return new Date(lead.submittedAt).toISOString().slice(0, 10) === today;
  }).length;

  const todaysTopMembers = [
    { name: "Yasmine Ben Ali", leadsToday: 12, rank: 1 },
    { name: "Omar Hsaini", leadsToday: 10, rank: 2 },
    { name: "Nour Bensaid", leadsToday: 8, rank: 3 },
    { name: "Salma Trabelsi", leadsToday: 7, rank: 4 },
    { name: "Imen Melki", leadsToday: 6, rank: 5 },
    { name: "Karim Jaziri", leadsToday: 5, rank: 6 },
  ];

  const dailyGoal = 30;
  const goalPct = Math.min(100, Math.round((todaysLeads / dailyGoal) * 100));

  const avatarFor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % ANIMAL_AVATARS.length;
    return ANIMAL_AVATARS[hash];
  };

  const first = todaysTopMembers.find((m) => m.rank === 1);
  const second = todaysTopMembers.find((m) => m.rank === 2);
  const third = todaysTopMembers.find((m) => m.rank === 3);
  const rest = todaysTopMembers.filter((m) => m.rank > 3);

  const podiumHeights: Record<number, string> = { 1: "h-20 sm:h-24", 2: "h-14 sm:h-16", 3: "h-10 sm:h-12" };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-white/90">
          Member Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Your daily progress and ranking overview.
        </p>
      </div>

      {/* Progress overview */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-gray-500 dark:text-gray-400">Leads Today</p>
            <p className="mt-1 text-3xl font-bold text-brand-500 tabular-nums">{todaysLeads}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm text-gray-500 dark:text-gray-400">Goal</p>
            <p className="mt-1 text-lg font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
              {dailyGoal}
            </p>
          </div>
        </div>
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-500 transition-all duration-700 ease-out"
            style={{ width: mounted ? `${goalPct}%` : "0%" }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {goalPct >= 100 ? "Daily goal reached 🎉" : `${goalPct}% of today's goal · ${Math.max(0, dailyGoal - todaysLeads)} to go`}
        </p>
      </div>

      {/* Daily leaderboard — podium style */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#171233] via-[#120e28] to-[#0d0a1e] p-4 sm:p-6 shadow-2xl">
        {/* ambient glow accents */}
        <div className="pointer-events-none absolute -top-16 -left-10 h-44 w-44 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -right-10 h-44 w-44 rounded-full bg-fuchsia-500/10 blur-3xl" />

        <div className="relative mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-white">Daily leaderboard</h2>
            <p className="text-xs text-violet-200/50 mt-0.5">Best performers today</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur px-3 py-1.5 text-xs font-semibold text-violet-200">
            <span>🏆</span>
            <span className="tabular-nums">{todaysLeads}</span>
          </div>
        </div>

        {/* Top 3 avatars with crowns/medals */}
        {first && (
          <div className="relative flex items-end justify-center gap-4 sm:gap-6 mb-3">
            {second && (
              <div
                className={`flex flex-col items-center transition-all duration-500 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
                style={{ transitionDelay: "80ms" }}
              >
                <span className="text-lg mb-0.5">🥈</span>
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white/[0.06] backdrop-blur border-2 border-slate-300/40 flex items-center justify-center text-2xl">
                  {avatarFor(second.name)}
                </div>
                <p className="mt-1.5 max-w-[68px] truncate text-[11px] sm:text-xs font-medium text-white text-center">
                  {second.name.split(" ")[0]}
                </p>
                <p className="text-[10px] sm:text-[11px] text-violet-200 font-semibold tabular-nums">
                  {second.leadsToday}
                </p>
              </div>
            )}

            <div
              className={`flex flex-col items-center transition-all duration-500 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
            >
              <span className="text-xl mb-0.5">👑</span>
              <div className="h-16 w-16 sm:h-[72px] sm:w-[72px] rounded-full bg-gradient-to-br from-violet-500/25 to-fuchsia-500/25 backdrop-blur border-2 border-violet-300/70 flex items-center justify-center text-3xl shadow-[0_0_24px_rgba(167,139,250,0.35)]">
                {avatarFor(first.name)}
              </div>
              <p className="mt-1.5 max-w-[80px] truncate text-xs sm:text-sm font-semibold text-white text-center">
                {first.name.split(" ")[0]}
              </p>
              <p className="text-xs text-violet-200 font-bold tabular-nums">{first.leadsToday}</p>
            </div>

            {third && (
              <div
                className={`flex flex-col items-center transition-all duration-500 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
                style={{ transitionDelay: "80ms" }}
              >
                <span className="text-lg mb-0.5">🥉</span>
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white/[0.06] backdrop-blur border-2 border-amber-300/40 flex items-center justify-center text-2xl">
                  {avatarFor(third.name)}
                </div>
                <p className="mt-1.5 max-w-[68px] truncate text-[11px] sm:text-xs font-medium text-white text-center">
                  {third.name.split(" ")[0]}
                </p>
                <p className="text-[10px] sm:text-[11px] text-violet-200 font-semibold tabular-nums">
                  {third.leadsToday}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Podium blocks */}
        {first && (
          <div className="relative flex items-end justify-center gap-1.5 sm:gap-2 mb-5">
            {second && (
              <div className="relative w-20 sm:w-24">
                <div className="absolute -top-1 left-0 right-0 h-1 rounded-full bg-gradient-to-r from-violet-400/60 to-fuchsia-400/60" />
                <div className={`${podiumHeights[2]} rounded-t-lg bg-white/[0.04] backdrop-blur border border-white/10 border-b-0 flex items-start justify-center pt-2`}>
                  <span className="text-2xl font-bold text-white/15">2</span>
                </div>
              </div>
            )}
            <div className="relative w-24 sm:w-28">
              <div className="absolute -top-1 left-0 right-0 h-1 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" />
              <div className={`${podiumHeights[1]} rounded-t-lg bg-white/[0.06] backdrop-blur border border-violet-300/20 border-b-0 flex items-start justify-center pt-2`}>
                <span className="text-3xl font-bold text-white/20">1</span>
              </div>
            </div>
            {third && (
              <div className="relative w-20 sm:w-24">
                <div className="absolute -top-1 left-0 right-0 h-1 rounded-full bg-gradient-to-r from-violet-400/60 to-fuchsia-400/60" />
                <div className={`${podiumHeights[3]} rounded-t-lg bg-white/[0.04] backdrop-blur border border-white/10 border-b-0 flex items-start justify-center pt-2`}>
                  <span className="text-2xl font-bold text-white/15">3</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ranks 4+ */}
        <div className="relative space-y-2">
          {rest.map((member, i) => (
            <div
              key={member.name}
              className={`flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur px-3 py-2.5 transition-all duration-500 ease-out hover:bg-white/[0.07] hover:border-white/20 ${
                mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
              }`}
              style={{ transitionDelay: `${250 + i * 70}ms` }}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="w-5 shrink-0 text-center text-xs font-semibold text-white/35 tabular-nums">
                  {String(member.rank).padStart(2, "0")}
                </span>
                <div className="h-8 w-8 shrink-0 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-base">
                  {avatarFor(member.name)}
                </div>
                <span className="truncate text-sm font-medium text-white">{member.name}</span>
              </div>
              <span className="shrink-0 text-sm font-bold text-violet-200 tabular-nums">
                {member.leadsToday}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline link */}
      <Link
        href="/member-dashboard/timeline"
        className="group flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">
            Attraction Timeline
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View-only. Changes are managed from the Admin side.
          </p>
        </div>
        <span className="shrink-0 text-brand-500 transition-transform duration-200 group-hover:translate-x-0.5">
          →
        </span>
      </Link>
    </div>
  );
}