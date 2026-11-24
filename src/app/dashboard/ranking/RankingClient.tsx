"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MemberStat } from "@/app/api/ranking/route";

type SortKey = "name" | "totalLeads" | "todayLeads";
type SortDir = "asc" | "desc";

const POLL_INTERVAL = 30_000;

function KPI({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${color ?? "text-gray-800 dark:text-white"}`}>{value}</p>
    </div>
  );
}

export default function RankingClient() {
  const [members, setMembers] = useState<MemberStat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState({ members: 0, leads: 0, today: 0 });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("totalLeads");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [activeTab, setActiveTab] = useState<"live" | "november">("live");
  const [novemberMembers, setNovemberMembers] = useState<MemberStat[]>([]);
  const [novemberLoading, setNovemberLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/ranking");
      const data = await res.json();

      if (data.success) {
        setMembers(data.members ?? []);
        setTotals({
          members: data.totalMembers ?? 0,
          leads: data.totalLeads ?? 0,
          today: data.todayLeads ?? 0,
        });
        setLastUpdate(data.generatedAt);
        setError(null);
      } else {
        setError(data.error ?? "RANKING_UNAVAILABLE");
      }
    } catch {
      setError("RANKING_UNAVAILABLE");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNovember = useCallback(async () => {
    setNovemberLoading(true);
    try {
      const res = await fetch("/api/ranking?month=2026-11");
      const data = await res.json();
      if (data.success) setNovemberMembers((data.members ?? []).slice(0, 5));
    } catch {
      setNovemberMembers([]);
    } finally {
      setNovemberLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchNovember();
    const id = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchData, fetchNovember]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return members.filter((m) => !q || m.name.toLowerCase().includes(q));
  }, [members, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const diff = sortKey === "name"
        ? a.name.localeCompare(b.name)
        : a[sortKey] - b[sortKey];
      return sortDir === "asc" ? diff : -diff;
    });
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("desc");
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? <span className="ml-1 text-brand-500">{sortDir === "asc" ? "↑" : "↓"}</span>
      : <span className="ml-1 text-gray-300 dark:text-gray-600">↕</span>;

  const Th = ({ k, children, right }: { k: SortKey; children: React.ReactNode; right?: boolean }) => (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none ${right ? "text-right" : "text-left"}`}
      onClick={() => toggleSort(k)}
    >
      {children}
      <SortIcon k={k} />
    </th>
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white py-20 dark:border-gray-700 dark:bg-white/[0.02]">
        <span className="text-5xl">⚠️</span>
        <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-300">Ranking is temporarily unavailable</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#312e81_55%,#7c3aed_100%)] p-6 text-white shadow-[0_20px_60px_-30px_rgba(79,70,229,0.75)] dark:border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-indigo-200">LC Bardo · Attraction Arena</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Member Ranking</h1>
            <p className="mt-2 text-sm text-indigo-100">
              Physical attraction performance · auto-refresh every 30 seconds
            </p>
          </div>
          <button
            onClick={() => { fetchData(); fetchNovember(); }}
            disabled={loading || novemberLoading}
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20 disabled:opacity-50"
          >
            {loading || novemberLoading ? "Refreshing…" : "↻ Refresh ranking"}
          </button>
        </div>

        <div className="mt-6 flex w-fit rounded-xl border border-white/10 bg-black/20 p-1">
          <button
            onClick={() => setActiveTab("live")}
            className={`rounded-lg px-5 py-2 text-sm font-bold transition ${activeTab === "live" ? "bg-white text-indigo-950 shadow-lg" : "text-indigo-100 hover:text-white"}`}
          >
            Live Ranking
          </button>
          <button
            onClick={() => setActiveTab("november")}
            className={`rounded-lg px-5 py-2 text-sm font-bold transition ${activeTab === "november" ? "bg-white text-indigo-950 shadow-lg" : "text-indigo-100 hover:text-white"}`}
          >
            November Top 5
          </button>
        </div>
      </div>

      {activeTab === "live" ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <KPI label="Members" value={totals.members} />
            <KPI label="Total Leads" value={totals.leads} />
            <KPI label="Today's Leads" value={totals.today} color="text-brand-500" />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search member name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-[180px] flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            />
            <p className="whitespace-nowrap text-sm text-gray-400">{sorted.length} member{sorted.length !== 1 ? "s" : ""}</p>
          </div>

          {loading && members.length === 0 ? (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 dark:border-gray-700">
              <p className="text-sm text-gray-400">Loading live data from sheet…</p>
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 dark:border-gray-700">
              <span className="text-5xl">🏆</span>
              <p className="mt-3 text-sm text-gray-500">No leads since 1 September yet.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100 dark:border-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">#</th>
                      <Th k="name">Member</Th>
                      <Th k="totalLeads" right>All-time Leads</Th>
                      <Th k="todayLeads" right>Today</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {sorted.map((m, i) => {
                      const rank = i + 1;
                      const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
                      return (
                        <tr key={m.name} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-sm text-gray-400">{medal ?? <span className="tabular-nums">{rank}</span>}</td>
                          <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">{m.name}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-700 dark:text-gray-300">{m.totalLeads}</td>
                          <td className="px-4 py-3 text-right tabular-nums"><span className={m.todayLeads > 0 ? "font-bold text-brand-500" : "text-gray-400"}>{m.todayLeads}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <section className="overflow-hidden rounded-3xl border border-amber-200/60 bg-[#090b18] shadow-[0_30px_90px_-35px_rgba(245,158,11,0.45)]">
          <div className="relative overflow-hidden border-b border-white/10 px-5 py-8 sm:px-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(251,191,36,0.32),transparent_42%),radial-gradient(circle_at_15%_100%,rgba(124,58,237,0.22),transparent_35%)]" />
            <div className="relative flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-amber-200">
                  <span>✦</span> November Champions
                </div>
                <h2 className="text-3xl font-black text-white sm:text-4xl">Top 5 Attractors</h2>
                <p className="mt-2 text-sm text-slate-400">Unique attractors ranked by November lead volume</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">November 2026</p>
                <p className="mt-1 text-2xl font-black text-amber-300">01–30 Nov</p>
              </div>
            </div>
          </div>

          {novemberLoading && novemberMembers.length === 0 ? (
            <div className="flex min-h-72 items-center justify-center text-slate-400">Loading November ranking…</div>
          ) : novemberMembers.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center text-slate-400">
              <span className="text-5xl">🏆</span>
              <p className="mt-3">No November attraction data yet.</p>
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              <div className="mb-5 grid grid-cols-3 items-end gap-2 sm:gap-4">
                {[novemberMembers[1], novemberMembers[0], novemberMembers[2]].filter(Boolean).map((m) => {
                  const rank = novemberMembers.findIndex((entry) => entry.name === m.name) + 1;
                  const isWinner = rank === 1;
                  return (
                    <div key={m.name} className={`relative flex flex-col items-center rounded-2xl border px-2 pb-4 pt-5 text-center ${isWinner ? "-mt-3 border-amber-300/40 bg-[linear-gradient(180deg,rgba(251,191,36,0.18),rgba(255,255,255,0.04))]" : "border-white/10 bg-white/[0.04]"}`}>
                      <div className={`absolute -top-4 grid h-8 w-8 place-items-center rounded-full text-sm font-black shadow-lg ${rank === 1 ? "bg-amber-300 text-amber-950" : rank === 2 ? "bg-slate-300 text-slate-900" : "bg-orange-400 text-orange-950"}`}>{rank}</div>
                      <div className={`grid place-items-center rounded-full font-black ${isWinner ? "h-20 w-20 text-3xl ring-4 ring-amber-300/30" : "h-14 w-14 text-xl ring-2 ring-white/15"}`} style={{ background: isWinner ? "linear-gradient(135deg,#fbbf24,#f97316)" : "linear-gradient(135deg,#6366f1,#9333ea)" }}>
                        {m.name.charAt(0)}
                      </div>
                      <p className="mt-3 max-w-full truncate text-sm font-bold text-white">{m.name}</p>
                      <p className={`mt-1 text-lg font-black ${isWinner ? "text-amber-300" : "text-slate-200"}`}>{m.totalLeads}</p>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">leads</p>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                {novemberMembers.map((m, i) => {
                  const rank = i + 1;
                  const max = novemberMembers[0]?.totalLeads || 1;
                  const width = Math.max(8, Math.round((m.totalLeads / max) * 100));
                  return (
                    <div key={m.name} className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3 sm:p-4">
                      <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500/10 to-transparent" style={{ width: `${width}%` }} />
                      <div className="relative flex items-center gap-3 sm:gap-4">
                        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-black ${rank === 1 ? "bg-amber-300 text-amber-950" : rank === 2 ? "bg-slate-300 text-slate-900" : rank === 3 ? "bg-orange-400 text-orange-950" : "bg-white/10 text-slate-300"}`}>{String(rank).padStart(2, "0")}</div>
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-black text-white">{m.name.charAt(0)}</div>
                        <p className="min-w-0 flex-1 truncate font-bold text-white">{m.name}</p>
                        <div className="text-right">
                          <p className="text-xl font-black text-white tabular-nums">{m.totalLeads}</p>
                          <p className="text-[10px] uppercase tracking-wider text-slate-500">leads</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
