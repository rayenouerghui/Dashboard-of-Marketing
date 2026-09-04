"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Badge from "@/components/ui/badge/Badge";
import type { MemberStat } from "@/app/api/ranking/route";

type SortKey = "totalLeads" | "todayLeads" | "applied" | "realized" | "applicationRate" | "realizationRate" | "name";
type SortDir = "asc" | "desc";

const POLL_INTERVAL = 30_000; // 30 s

function RateBar({ value, color = "blue" }: { value: number; color?: "blue" | "green" | "emerald" }) {
  const bg = color === "green" ? "bg-green-500" : color === "emerald" ? "bg-emerald-500" : "bg-blue-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div className={`h-full rounded-full transition-all duration-500 ${bg}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">{value.toFixed(1)}%</span>
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${color ?? "text-gray-800 dark:text-white"}`}>{value}</p>
    </div>
  );
}

export default function RankingClient() {
  const [members, setMembers]       = useState<MemberStat[]>([]);
  const [totals, setTotals]         = useState({ members: 0, leads: 0, today: 0, applied: 0, realized: 0 });
  const [loading, setLoading]       = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [search, setSearch]         = useState("");
  const [sortKey, setSortKey]       = useState<SortKey>("totalLeads");
  const [sortDir, setSortDir]       = useState<SortDir>("desc");

  const fetchData = useCallback(async () => {
    try {
      const res  = await fetch("/api/ranking");
      const data = await res.json();
      if (data.success) {
        setMembers(data.members ?? []);
        setTotals({
          members:  data.totalMembers ?? 0,
          leads:    data.totalLeads   ?? 0,
          today:    data.todayLeads   ?? 0,
          applied:  data.totalApplied ?? 0,
          realized: data.totalRealized ?? 0,
        });
        setLastUpdate(data.generatedAt);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  // Initial fetch + 30 s polling
  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchData]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return members.filter((m) => !q || m.name.toLowerCase().includes(q));
  }, [members, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const diff = sortKey === "name"
        ? a.name.localeCompare(b.name)
        : (a[sortKey] as number) - (b[sortKey] as number);
      return sortDir === "asc" ? diff : -diff;
    });
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
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
      {children}<SortIcon k={k} />
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Member Ranking</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Live from Physical sheet · ranked by total leads · auto-refreshes every 30 s
            {lastUpdate && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-gray-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                {new Date(lastUpdate).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          {loading ? "Loading…" : "↻ Refresh now"}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <KPI label="Members" value={totals.members} />
        <KPI label="Total Leads" value={totals.leads} />
        <KPI label="Today's Leads" value={totals.today} color="text-brand-500" />
        <KPI label="Applied (EXPA)" value={totals.applied} color="text-blue-600 dark:text-blue-400" />
        <KPI label="Realized (EXPA)" value={totals.realized} color="text-emerald-600 dark:text-emerald-400" />
      </div>

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search member name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[180px] rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        />
        <p className="text-sm text-gray-400 whitespace-nowrap">{sorted.length} member{sorted.length !== 1 ? "s" : ""}</p>
      </div>

      {loading && members.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 dark:border-gray-700">
          <p className="text-sm text-gray-400">Loading live data from sheet…</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">#</th>
                  <Th k="name">Member</Th>
                  <Th k="totalLeads" right>Total Leads</Th>
                  <Th k="todayLeads" right>Today</Th>
                  <Th k="applied" right>Applied</Th>
                  <Th k="realized" right>Realized</Th>
                  <Th k="applicationRate">App. Rate</Th>
                  <Th k="realizationRate">Real. Rate</Th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-sm text-gray-400">No members found.</td>
                  </tr>
                ) : sorted.map((m, i) => {
                  const rank = i + 1;
                  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
                  return (
                    <tr key={m.name} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {medal ?? <span className="tabular-nums">{rank}</span>}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">{m.name}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 tabular-nums">{m.totalLeads}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className={m.todayLeads > 0 ? "font-bold text-brand-500" : "text-gray-400"}>
                          {m.todayLeads}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-600 dark:text-blue-400 tabular-nums">{m.applied}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{m.realized}</td>
                      <td className="px-4 py-3"><RateBar value={m.applicationRate} color="blue" /></td>
                      <td className="px-4 py-3"><RateBar value={m.realizationRate} color="emerald" /></td>
                      <td className="px-4 py-3 text-center">
                        {m.realized > 0 ? (
                          <Badge size="sm" color="success">Realized</Badge>
                        ) : m.applied > 0 ? (
                          <Badge size="sm" color="primary">Applied</Badge>
                        ) : m.totalLeads > 0 ? (
                          <Badge size="sm" color="warning">Leads only</Badge>
                        ) : (
                          <Badge size="sm" color="light">Inactive</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
