"use client";

import { useEffect, useState, useMemo } from "react";
import type { ExpaApplication } from "@/lib/server/expaApplicationsClient";

// ─── Status priority (shared constant — mirrored from expaApplicationsClient) ─
const STATUS_PRIORITY: Record<string, number> = {
  completed:            7,
  finished:             6,
  realized:             5,
  matched:              4,
  approved_ep_manager:  3,
  approved:             3,
  accepted:             3,
  open:                 1,
};

// ─── Status display config ────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  open:                 { label: "Open",      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",       dot: "bg-blue-400" },
  accepted:             { label: "Accepted",  color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",       dot: "bg-cyan-400" },
  approved:             { label: "Approved",  color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", dot: "bg-violet-400" },
  approved_ep_manager:  { label: "Approved",  color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", dot: "bg-violet-400" },
  matched:              { label: "Matched",   color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", dot: "bg-orange-400" },
  realized:             { label: "Realized",  color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", dot: "bg-emerald-400" },
  completed:            { label: "Completed", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",   dot: "bg-green-500" },
  finished:             { label: "Finished",  color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",       dot: "bg-teal-400" },
};

const PROGRAMME_COLORS: Record<string, string> = {
  GTa: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  GTe: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  GV:  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function ProgrammeBadge({ programme }: { programme: string }) {
  const cls = PROGRAMME_COLORS[programme] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {programme || "—"}
    </span>
  );
}

function formatDate(iso: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
  } catch { return iso; }
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1.5 text-3xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
    </div>
  );
}

// ─── Funnel step ──────────────────────────────────────────────────────────────
const FUNNEL_STEPS = [
  { key: "open",     label: "Applied",  statuses: ["open", "accepted"] },
  { key: "approved", label: "Approved", statuses: ["approved", "approved_ep_manager", "accepted"] },
  { key: "matched",  label: "Matched",  statuses: ["matched"] },
  { key: "realized", label: "Realized", statuses: ["realized", "completed", "finished"] },
] as const;

export default function ConversionRateClient() {
  const [applications, setApplications] = useState<ExpaApplication[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [search, setSearch]             = useState("");
  const [filterProgramme, setFilterProgramme] = useState("ALL");
  const [filterStatus, setFilterStatus]       = useState("ALL");
  const [lastFetched, setLastFetched]   = useState<string | null>(null);
  const [totalItems, setTotalItems]     = useState(0);
  const [fromYear, setFromYear]         = useState(String(new Date().getFullYear()));

  async function load(nocache = false) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from: `${fromYear}-01-01` });
      if (nocache) params.set("nocache", "1");
      const res  = await fetch(`/api/expa/applications?${params}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Failed to load.");
      setApplications(data.applications);
      setTotalItems(data.totalItems);
      setLastFetched(data.cachedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [fromYear]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived data ─────────────────────────────────────────────────────────────

  const programmes = useMemo(() => {
    const set = new Set(applications.map((a) => a.programme).filter(Boolean));
    return ["ALL", ...Array.from(set).sort()];
  }, [applications]);

  const filtered = useMemo(() => {
    let list = applications;
    if (filterProgramme !== "ALL") list = list.filter((a) => a.programme === filterProgramme);
    if (filterStatus    !== "ALL") list = list.filter((a) => normaliseStatus(a.status) === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) =>
        a.epName.toLowerCase().includes(q) ||
        a.epEmail.toLowerCase().includes(q) ||
        a.opportunityTitle.toLowerCase().includes(q)
      );
    }
    return list;
  }, [applications, filterProgramme, filterStatus, search]);

  // Funnel counts (from full unfiltered set, filtered by programme only)
  const funnelBase = useMemo(() =>
    filterProgramme === "ALL" ? applications : applications.filter((a) => a.programme === filterProgramme),
    [applications, filterProgramme]
  );

  const funnelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const step of FUNNEL_STEPS) {
      counts[step.key] = funnelBase.filter((a) => (step.statuses as readonly string[]).includes(normaliseStatus(a.status))).length;
    }
    return counts;
  }, [funnelBase]);

  const uniqueEPs    = applications.length;
  const realized     = funnelCounts["realized"];
  const approved     = funnelCounts["approved"];
  const convRate     = uniqueEPs > 0 ? ((realized / uniqueEPs) * 100).toFixed(1) : "0.0";
  const approvalRate = uniqueEPs > 0 ? ((approved / uniqueEPs) * 100).toFixed(1) : "0.0";

  // Status options for filter dropdown
  const statusOptions = useMemo(() => {
    const set = new Set(applications.map((a) => normaliseStatus(a.status)));
    return ["ALL", ...Array.from(set).sort()];
  }, [applications]);

  function exportCSV() {
    if (filtered.length === 0) return;
    const headers = ["EP ID", "EP Name", "EP Email", "Status", "Programme", "Opportunity", "Application Date", "Signup Date"];
    const rows = filtered.map((a) => [
      a.epId, a.epName, a.epEmail, a.status, a.programme,
      a.opportunityTitle, a.createdAt, a.epCreatedAt,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ep-conversion-${fromYear}.csv`;
    link.click();
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-500">Analytics</p>
            <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">EP Conversion Rate</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Live data from EXPA — one entry per EP, best status kept.
              {lastFetched && (
                <span className="ml-2 text-xs text-gray-400">
                  Cached {new Date(lastFetched).toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={fromYear}
              onChange={(e) => setFromYear(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              {[2024, 2025, 2026].map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
            <button
              onClick={() => load(true)}
              disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {loading ? "Loading…" : "↻ Refresh"}
            </button>
            <button
              onClick={exportCSV}
              disabled={loading || filtered.length === 0}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-20 dark:border-gray-700 dark:bg-white/[0.02]">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="mt-3 text-sm text-gray-400">Fetching EP data from EXPA…</p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Unique EPs" value={uniqueEPs} sub={`${totalItems} raw applications`} />
            <StatCard label="Approved" value={approved} sub={`${approvalRate}% of EPs`} />
            <StatCard label="Realized" value={realized} sub={`${convRate}% conversion`} />
            <StatCard label="Conversion Rate" value={`${convRate}%`} sub="Applied → Realized" />
          </div>

          {/* Funnel */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Conversion Funnel
              {filterProgramme !== "ALL" && <span className="ml-2 normal-case text-brand-500">· {filterProgramme}</span>}
            </h2>
            <div className="flex flex-wrap items-end gap-3">
              {FUNNEL_STEPS.map((step, i) => {
                const count = funnelCounts[step.key];
                const base  = funnelCounts[FUNNEL_STEPS[0].key] || 1;
                const pct   = Math.round((count / base) * 100);
                const maxH  = 80;
                const barH  = Math.max(6, Math.round((count / (funnelBase.length || 1)) * maxH));
                return (
                  <div key={step.key} className="flex flex-1 min-w-[80px] flex-col items-center gap-1.5">
                    {i > 0 && (
                      <span className="mb-0.5 text-[10px] text-gray-400">{pct}%</span>
                    )}
                    <div
                      className="w-full rounded-t-lg bg-brand-500 transition-all duration-700"
                      style={{ height: `${barH}px`, opacity: 0.3 + (pct / 100) * 0.7 }}
                    />
                    <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{count}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{step.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search EP name, email, opportunity…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[200px] rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
            <select
              value={filterProgramme}
              onChange={(e) => setFilterProgramme(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              {programmes.map((p) => <option key={p} value={p}>{p === "ALL" ? "All Programmes" : p}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s === "ALL" ? "All Statuses" : (STATUS_CONFIG[s]?.label ?? s)}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500">
            Showing {filtered.length} of {applications.length} EPs
          </p>

          {/* Table — desktop */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="px-4 py-3">EP Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Programme</th>
                  <th className="px-4 py-3">Opportunity</th>
                  <th className="px-4 py-3">Applied</th>
                  <th className="px-4 py-3">Signed Up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                      No EPs match the current filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((a) => (
                    <tr key={a.applicationId} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 dark:text-white">{a.epName || "—"}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[180px]">{a.epEmail}</p>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                      <td className="px-4 py-3"><ProgrammeBadge programme={a.programme} /></td>
                      <td className="px-4 py-3 max-w-[220px] truncate text-gray-600 dark:text-gray-400">{a.opportunityTitle || "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(a.createdAt)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(a.epCreatedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Cards — mobile */}
          <div className="space-y-3 md:hidden">
            {filtered.map((a) => (
              <div key={a.applicationId} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-white truncate">{a.epName || "—"}</p>
                    <p className="text-xs text-gray-400 truncate">{a.epEmail}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{a.opportunityTitle || "—"}</p>
                <div className="mt-2 flex items-center gap-2">
                  <ProgrammeBadge programme={a.programme} />
                  <span className="text-xs text-gray-400">{formatDate(a.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function normaliseStatus(status: string): string {
  // Fold approved_ep_manager → approved for display consistency
  if (status === "approved_ep_manager" || status === "accepted") return "approved";
  return status;
}
