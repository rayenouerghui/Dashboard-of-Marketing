"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import type { MemberStat } from "@/app/api/ranking/route";

const POLL_INTERVAL = 30_000;

const ANIMAL_AVATARS = ["🦊", "🐼", "🦁", "🐨", "🐯", "🐰", "🦉", "🐺", "🐸", "🐻"];
function avatarFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % ANIMAL_AVATARS.length;
  return ANIMAL_AVATARS[h];
}

// Rank 1 = gold, 2 = silver, 3 = bronze, 4-5 = purple gradient
const RANK_STYLES: Record<number, {
  ring: string; glow: string; badge: string; crown: string; barColor: string;
}> = {
  1: { ring: "border-amber-300/80",   glow: "shadow-[0_0_32px_rgba(251,191,36,0.4)]",   badge: "from-amber-400 to-yellow-300",   crown: "👑", barColor: "from-amber-400 to-yellow-300" },
  2: { ring: "border-slate-300/70",   glow: "shadow-[0_0_20px_rgba(148,163,184,0.3)]",  badge: "from-slate-300 to-slate-400",    crown: "🥈", barColor: "from-slate-300 to-slate-400" },
  3: { ring: "border-amber-600/60",   glow: "shadow-[0_0_20px_rgba(180,83,9,0.25)]",    badge: "from-amber-600 to-orange-500",   crown: "🥉", barColor: "from-amber-500 to-orange-400" },
  4: { ring: "border-violet-400/40",  glow: "",                                           badge: "from-violet-500 to-purple-600",  crown: "4",  barColor: "from-violet-400 to-purple-500" },
  5: { ring: "border-violet-400/30",  glow: "",                                           badge: "from-violet-600 to-indigo-600",  crown: "5",  barColor: "from-indigo-400 to-violet-500" },
};

export default function MemberRankingClient() {
  const [members, setMembers]       = useState<MemberStat[]>([]);
  const [loading, setLoading]       = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [mounted, setMounted]       = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // First fetch sheet-only data immediately (fast ~1s) — shows ranking right away
      const res = await fetch("/api/ranking?expa=0");
      const data = await res.json();
      if (data.success) {
        setMembers(data.members ?? []);
        setLastUpdate(data.generatedAt);
        setLoading(false);
      }

      // Then fetch with EXPA data in background (slow — cached 15 min on server)
      const resExpa = await fetch("/api/ranking");
      const dataExpa = await resExpa.json();
      if (dataExpa.success) {
        setMembers(dataExpa.members ?? []);
        setLastUpdate(dataExpa.generatedAt);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const t = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(t); }, []);
  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchData]);

  // Top 5 overall
  const top5 = useMemo(() =>
    [...members]
      .sort((a, b) => b.totalLeads - a.totalLeads || a.name.localeCompare(b.name))
      .slice(0, 5)
      .map((m, i) => ({ ...m, rank: i + 1 })),
    [members]
  );

  const maxLeads = top5[0]?.totalLeads || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-white/90">
            Overall Leaderboard
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Top 5 members · all-time physical leads
            {lastUpdate && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-gray-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                {new Date(lastUpdate).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
      </div>

      {loading && members.length === 0 ? (
        <div className="flex items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white py-20 dark:border-gray-700 dark:bg-white/[0.02]">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="mt-3 text-sm text-gray-400">Loading rankings…</p>
          </div>
        </div>
      ) : top5.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white py-20 dark:border-gray-700 dark:bg-white/[0.02]">
          <span className="text-5xl">🏆</span>
          <p className="mt-3 text-sm text-gray-500">No data available yet.</p>
        </div>
      ) : (
        <>
          {/* ── Dark podium card for #1, #2, #3 ──────────────────────────── */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#24243e] p-6 shadow-2xl">
            {/* ambient blobs */}
            <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-violet-600/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-fuchsia-600/15 blur-3xl" />
            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl" />

            <p className="relative mb-6 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">
              All-Time Top Members
            </p>

            {/* Podium avatars — 2, 1, 3 order */}
            <div className="relative flex items-end justify-center gap-3 sm:gap-5 mb-1">
              {/* 2nd */}
              {top5[1] && (
                <div
                  className={`flex flex-col items-center transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                  style={{ transitionDelay: "100ms" }}
                >
                  <span className="text-xl mb-2">{RANK_STYLES[2].crown}</span>
                  <div className={`relative h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-white/[0.07] border-2 ${RANK_STYLES[2].ring} flex items-center justify-center text-2xl backdrop-blur ${RANK_STYLES[2].glow}`}>
                    {avatarFor(top5[1].name)}
                    <span className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br ${RANK_STYLES[2].badge} flex items-center justify-center text-[9px] font-black text-white shadow`}>2</span>
                  </div>
                  <p className="mt-2 max-w-[70px] truncate text-center text-xs font-semibold text-white/80">{top5[1].name.split(" ")[0]}</p>
                  <p className="text-[11px] font-bold text-slate-300 tabular-nums">{top5[1].totalLeads}</p>
                </div>
              )}

              {/* 1st — tallest */}
              <div
                className={`flex flex-col items-center -mt-4 transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              >
                <span className="text-3xl mb-2 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]">👑</span>
                <div className={`relative h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-400/20 border-2 ${RANK_STYLES[1].ring} flex items-center justify-center text-4xl backdrop-blur ${RANK_STYLES[1].glow}`}>
                  {avatarFor(top5[0].name)}
                  <span className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-gradient-to-br ${RANK_STYLES[1].badge} flex items-center justify-center text-[10px] font-black text-white shadow-lg`}>1</span>
                </div>
                <p className="mt-2 max-w-[80px] truncate text-center text-sm font-bold text-white">{top5[0].name.split(" ")[0]}</p>
                <p className="text-sm font-black text-amber-300 tabular-nums drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]">{top5[0].totalLeads}</p>
                <p className="text-[10px] text-amber-400/70 mt-0.5">leads</p>
              </div>

              {/* 3rd */}
              {top5[2] && (
                <div
                  className={`flex flex-col items-center transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                  style={{ transitionDelay: "100ms" }}
                >
                  <span className="text-xl mb-2">{RANK_STYLES[3].crown}</span>
                  <div className={`relative h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-white/[0.07] border-2 ${RANK_STYLES[3].ring} flex items-center justify-center text-2xl backdrop-blur ${RANK_STYLES[3].glow}`}>
                    {avatarFor(top5[2].name)}
                    <span className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br ${RANK_STYLES[3].badge} flex items-center justify-center text-[9px] font-black text-white shadow`}>3</span>
                  </div>
                  <p className="mt-2 max-w-[70px] truncate text-center text-xs font-semibold text-white/80">{top5[2].name.split(" ")[0]}</p>
                  <p className="text-[11px] font-bold text-amber-600/90 tabular-nums">{top5[2].totalLeads}</p>
                </div>
              )}
            </div>

            {/* Podium stage */}
            <div className="relative flex items-end justify-center gap-1.5 mt-3">
              {top5[1] && (
                <div className="w-20 sm:w-24 h-10 rounded-t-xl bg-white/[0.04] border border-white/[0.07] border-b-0 flex items-center justify-center">
                  <span className="text-lg font-black text-white/10">2</span>
                </div>
              )}
              <div className="w-24 sm:w-28 h-16 rounded-t-xl bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-300/20 border-b-0 flex items-center justify-center">
                <span className="text-2xl font-black text-white/10">1</span>
              </div>
              {top5[2] && (
                <div className="w-20 sm:w-24 h-7 rounded-t-xl bg-white/[0.04] border border-white/[0.07] border-b-0 flex items-center justify-center">
                  <span className="text-base font-black text-white/10">3</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Ranks 4 & 5 — horizontal bar cards ──────────────────────── */}
          {top5.slice(3).length > 0 && (
            <div className="space-y-3">
              {top5.slice(3).map((m, i) => {
                const s = RANK_STYLES[m.rank];
                const barPct = Math.round((m.totalLeads / maxLeads) * 100);
                return (
                  <div
                    key={m.name}
                    className={`relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] transition-all duration-500 ease-out ${mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
                    style={{ transitionDelay: `${300 + i * 80}ms` }}
                  >
                    {/* background bar */}
                    <div
                      className={`absolute inset-y-0 left-0 bg-gradient-to-r ${s.barColor} opacity-[0.07] transition-all duration-700 ease-out rounded-2xl`}
                      style={{ width: mounted ? `${barPct}%` : "0%" }}
                    />
                    <div className="relative flex items-center gap-4">
                      {/* rank badge */}
                      <div className={`h-8 w-8 shrink-0 rounded-full bg-gradient-to-br ${s.badge} flex items-center justify-center text-[11px] font-black text-white shadow`}>
                        {m.rank}
                      </div>
                      {/* avatar */}
                      <div className="h-10 w-10 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xl">
                        {avatarFor(m.name)}
                      </div>
                      {/* name */}
                      <p className="flex-1 min-w-0 truncate text-sm font-semibold text-gray-800 dark:text-white">{m.name}</p>
                      {/* score */}
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-black tabular-nums text-gray-800 dark:text-white">{m.totalLeads}</p>
                        <p className="text-[10px] text-gray-400">leads</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </>
      )}
    </div>
  );
}
