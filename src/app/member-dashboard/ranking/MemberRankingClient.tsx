"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import type { MemberStat } from "@/app/api/ranking/route";

const POLL_INTERVAL = 30_000; // 30 s real-time refresh

const ANIMAL_AVATARS = ["🦊", "🐼", "🦁", "🐨", "🐯", "🐰", "🦉", "🐺", "🐸", "🐻"];

function avatarFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % ANIMAL_AVATARS.length;
  return ANIMAL_AVATARS[hash];
}

const RANK_GRADIENT: Record<number, string> = {
  1: "from-amber-400 to-yellow-300",
  2: "from-slate-300 to-slate-400",
  3: "from-emerald-400 to-green-500",
};

type Tab = "today" | "overall";

export default function MemberRankingClient() {
  const [members, setMembers]       = useState<MemberStat[]>([]);
  const [loading, setLoading]       = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [tab, setTab]               = useState<Tab>("today");
  const [mounted, setMounted]       = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res  = await fetch("/api/ranking");
      const data = await res.json();
      if (data.success) {
        setMembers(data.members ?? []);
        setLastUpdate(data.generatedAt);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchData]);

  // Today's leaderboard — sorted by todayLeads, only those with ≥1 lead today
  const todayRanked = useMemo(() =>
    [...members]
      .filter((m) => m.todayLeads > 0)
      .sort((a, b) => b.todayLeads - a.todayLeads)
      .map((m, i) => ({ ...m, rank: i + 1 })),
    [members]
  );

  // Overall leaderboard — sorted by totalLeads, top 10
  const overallRanked = useMemo(() =>
    [...members]
      .sort((a, b) => b.totalLeads - a.totalLeads || a.name.localeCompare(b.name))
      .slice(0, 10)
      .map((m, i) => ({ ...m, rank: i + 1 })),
    [members]
  );

  const active = tab === "today" ? todayRanked : overallRanked;
  const topThree = active.slice(0, 3);
  const rest     = active.slice(3);
  const valueKey: keyof MemberStat = tab === "today" ? "todayLeads" : "totalLeads";

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-white/90">
            Member Leaderboard
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Live from Physical sheet
            {lastUpdate && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-gray-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                {new Date(lastUpdate).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        {(["today", "overall"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
              tab === t
                ? "bg-brand-500 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
          >
            {t === "today" ? "Today (24h)" : "Overall"}
          </button>
        ))}
      </div>

      {loading && members.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 dark:border-gray-700 dark:bg-white/[0.03]">
          <div className="text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="mt-3 text-sm text-gray-400">Loading live rankings…</p>
          </div>
        </div>
      ) : active.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 dark:border-gray-700 dark:bg-white/[0.03]">
          <span className="text-4xl">🏆</span>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {tab === "today" ? "No leads recorded yet today." : "No data available."}
          </p>
        </div>
      ) : (
        <>
          {/* Podium — top 3 */}
          {topThree.length > 0 && (
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#171233] via-[#120e28] to-[#0d0a1e] p-5 sm:p-6 shadow-2xl">
              <div className="pointer-events-none absolute -top-16 -left-10 h-44 w-44 rounded-full bg-violet-500/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 -right-10 h-44 w-44 rounded-full bg-fuchsia-500/10 blur-3xl" />

              <p className="relative mb-5 text-xs font-semibold uppercase tracking-widest text-violet-200/40">
                {tab === "today" ? "Today's top performers" : "All-time top performers"}
              </p>

              <div className="relative flex items-end justify-center gap-4 sm:gap-6">
                {/* 2nd */}
                {topThree[1] && (
                  <div className={`flex flex-col items-center transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: "80ms" }}>
                    <span className="text-xl mb-1">🥈</span>
                    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white/[0.06] border-2 border-slate-300/40 flex items-center justify-center text-2xl">
                      {avatarFor(topThree[1].name)}
                    </div>
                    <p className="mt-1.5 max-w-[68px] truncate text-[11px] font-medium text-white text-center">{topThree[1].name.split(" ")[0]}</p>
                    <p className="text-[10px] text-violet-200 font-semibold tabular-nums">{topThree[1][valueKey] as number}</p>
                  </div>
                )}

                {/* 1st */}
                <div className={`flex flex-col items-center transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                  <span className="text-2xl mb-1">👑</span>
                  <div className="h-16 w-16 sm:h-[72px] sm:w-[72px] rounded-full bg-gradient-to-br from-violet-500/25 to-fuchsia-500/25 border-2 border-violet-300/70 flex items-center justify-center text-3xl shadow-[0_0_24px_rgba(167,139,250,0.35)]">
                    {avatarFor(topThree[0].name)}
                  </div>
                  <p className="mt-1.5 max-w-[80px] truncate text-xs sm:text-sm font-semibold text-white text-center">{topThree[0].name.split(" ")[0]}</p>
                  <p className="text-xs text-violet-200 font-bold tabular-nums">{topThree[0][valueKey] as number}</p>
                </div>

                {/* 3rd */}
                {topThree[2] && (
                  <div className={`flex flex-col items-center transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: "80ms" }}>
                    <span className="text-xl mb-1">🥉</span>
                    <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white/[0.06] border-2 border-amber-300/40 flex items-center justify-center text-2xl">
                      {avatarFor(topThree[2].name)}
                    </div>
                    <p className="mt-1.5 max-w-[68px] truncate text-[11px] font-medium text-white text-center">{topThree[2].name.split(" ")[0]}</p>
                    <p className="text-[10px] text-violet-200 font-semibold tabular-nums">{topThree[2][valueKey] as number}</p>
                  </div>
                )}
              </div>

              {/* Podium bars */}
              <div className="relative mt-4 flex items-end justify-center gap-1.5">
                {topThree[1] && (
                  <div className="w-20 sm:w-24 h-14 rounded-t-lg bg-white/[0.04] border border-white/10 border-b-0 flex items-start justify-center pt-2">
                    <span className="text-xl font-bold text-white/15">2</span>
                  </div>
                )}
                <div className="w-24 sm:w-28 h-20 rounded-t-lg bg-white/[0.06] border border-violet-300/20 border-b-0 flex items-start justify-center pt-2">
                  <span className="text-2xl font-bold text-white/20">1</span>
                </div>
                {topThree[2] && (
                  <div className="w-20 sm:w-24 h-10 rounded-t-lg bg-white/[0.04] border border-white/10 border-b-0 flex items-start justify-center pt-2">
                    <span className="text-xl font-bold text-white/15">3</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ranks 4+ */}
          {rest.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="space-y-2">
                {rest.map((m, i) => (
                  <div
                    key={m.name}
                    className={`flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2.5 transition-all duration-500 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800 ${mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"}`}
                    style={{ transitionDelay: `${200 + i * 60}ms` }}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-5 shrink-0 text-center text-xs font-semibold text-gray-500 tabular-nums">{m.rank}</span>
                      <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-base">
                        {avatarFor(m.name)}
                      </div>
                      <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">{m.name}</span>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-sm font-bold text-orange-500 dark:text-orange-400 tabular-nums">
                        {m[valueKey] as number}
                      </span>
                      {tab === "overall" && m.realized > 0 && (
                        <p className="text-[10px] text-emerald-500">{m.realized} realized</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary row */}
          {tab === "overall" && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Top member leads", value: overallRanked[0]?.totalLeads ?? 0 },
                { label: "Top member applied", value: [...members].sort((a,b) => b.applied - a.applied)[0]?.applied ?? 0 },
                { label: "Top member realized", value: [...members].sort((a,b) => b.realized - a.realized)[0]?.realized ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-gray-800 dark:text-white">{value}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
