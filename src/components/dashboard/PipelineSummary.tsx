"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { ExpaApplication } from "@/lib/server/expaApplicationsClient";

// ─── Status bucketing ─────────────────────────────────────────────────────────
const APPLIED_STATUSES  = new Set(["open", "accepted", "approved", "approved_ep_manager", "matched", "realized", "completed", "finished"]);
const APPROVED_STATUSES = new Set(["approved", "approved_ep_manager", "accepted", "matched", "realized", "completed", "finished"]);
const REALIZED_STATUSES = new Set(["realized", "completed", "finished"]);

function formatRate(n: number) { return `${n.toFixed(1)}%`; }

interface Stats {
  totalLeads:    number; // from /api/ranking
  uniqueEPs:     number; // from /api/expa/applications (deduplicated)
  open:          number;
  approved:      number;
  realized:      number;
  byProgramme:   Array<{ programme: string; total: number; open: number; approved: number; realized: number }>;
  approvalRate:  number;
  realizationRate: number;
  fetchedAt:     string | null;
}

const EMPTY: Stats = {
  totalLeads: 0, uniqueEPs: 0, open: 0, approved: 0, realized: 0,
  byProgramme: [], approvalRate: 0, realizationRate: 0, fetchedAt: null,
};

export default function PipelineSummary() {
  const [stats, setStats]   = useState<Stats>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch EXPA applications + ranking totals in parallel
      const [expaRes, rankRes] = await Promise.all([
        fetch("/api/expa/applications"),
        fetch("/api/ranking"),
      ]);

      const [expaData, rankData] = await Promise.all([expaRes.json(), rankRes.json()]);

      if (!expaRes.ok || !expaData.success) throw new Error(expaData.error ?? "EXPA fetch failed");

      const apps: ExpaApplication[] = expaData.applications ?? [];
      const totalLeads: number = rankData.success ? (rankData.totalLeads ?? 0) : 0;

      // Per-programme map
      const progMap = new Map<string, { total: number; open: number; approved: number; realized: number }>();
      let open = 0, approved = 0, realized = 0;

      for (const app of apps) {
        const prog = app.programme || "Other";
        if (!progMap.has(prog)) progMap.set(prog, { total: 0, open: 0, approved: 0, realized: 0 });
        const p = progMap.get(prog)!;
        p.total++;
        if (APPLIED_STATUSES.has(app.status))  { p.open++;     open++;     }
        if (APPROVED_STATUSES.has(app.status)) { p.approved++; approved++; }
        if (REALIZED_STATUSES.has(app.status)) { p.realized++; realized++; }
      }

      const uniqueEPs = apps.length;
      const byProgramme = [...progMap.entries()]
        .map(([programme, v]) => ({ programme, ...v }))
        .sort((a, b) => b.total - a.total);

      setStats({
        totalLeads,
        uniqueEPs,
        open,
        approved,
        realized,
        byProgramme,
        approvalRate:   uniqueEPs > 0 ? (approved  / uniqueEPs) * 100 : 0,
        realizationRate: uniqueEPs > 0 ? (realized / uniqueEPs) * 100 : 0,
        fetchedAt: expaData.cachedAt ?? new Date().toISOString(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pipeline data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const kpis = [
    { label: "Total Leads",      value: stats.totalLeads.toLocaleString(), sub: "from sheet",                            color: "text-gray-800 dark:text-white",           bg: "bg-gray-50 dark:bg-white/[0.04]",           border: "border-gray-200 dark:border-gray-700" },
    { label: "Unique EPs",       value: stats.uniqueEPs.toLocaleString(),  sub: stats.totalLeads > 0 ? `${formatRate((stats.uniqueEPs / stats.totalLeads) * 100)} of leads` : "—", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/[0.08]", border: "border-blue-200 dark:border-blue-500/30" },
    { label: "Applied / Open",   value: stats.open.toLocaleString(),       sub: `${formatRate(stats.uniqueEPs > 0 ? (stats.open / stats.uniqueEPs) * 100 : 0)} of EPs`,     color: "text-indigo-600 dark:text-indigo-400",    bg: "bg-indigo-50 dark:bg-indigo-500/[0.08]",    border: "border-indigo-200 dark:border-indigo-500/30" },
    { label: "Approved",         value: stats.approved.toLocaleString(),   sub: formatRate(stats.approvalRate),           color: "text-emerald-600 dark:text-emerald-400",  bg: "bg-emerald-50 dark:bg-emerald-500/[0.08]",  border: "border-emerald-200 dark:border-emerald-500/30" },
    { label: "Realized",         value: stats.realized.toLocaleString(),   sub: formatRate(stats.realizationRate),        color: "text-violet-600 dark:text-violet-400",    bg: "bg-violet-50 dark:bg-violet-500/[0.08]",    border: "border-violet-200 dark:border-violet-500/30" },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
            EXPA · Live Data
          </p>
          <h2 className="mt-1 text-lg font-semibold text-gray-800 dark:text-white/90">
            Conversion Overview
          </h2>
          {!loading && !error && (
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {stats.uniqueEPs.toLocaleString()} unique EPs · approval{" "}
              <strong className="text-emerald-600 dark:text-emerald-400">{formatRate(stats.approvalRate)}</strong>
              {" "}· realization{" "}
              <strong className="text-violet-600 dark:text-violet-400">{formatRate(stats.realizationRate)}</strong>
              {stats.fetchedAt && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-gray-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {new Date(stats.fetchedAt).toLocaleTimeString()}
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            disabled={loading}
            className="text-xs font-medium text-gray-400 hover:text-gray-600 disabled:opacity-40 transition-colors"
          >
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
          <Link
            href="/dashboard/conversion-rate"
            className="text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 transition-colors"
          >
            Full report →
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* KPI cards — skeleton while loading */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {kpis.map((k) => (
            <div key={k.label} className={`rounded-xl border px-3 py-3 ${k.bg} ${k.border}`}>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">{k.label}</p>
              <p className={`mt-1.5 text-2xl font-bold tabular-nums leading-none ${k.color}`}>{k.value}</p>
              <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">{k.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Programme breakdown */}
      {!loading && !error && stats.byProgramme.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            By Programme
          </p>
          {stats.byProgramme.map((prog) => {
            const approvPct = prog.total > 0 ? (prog.approved / prog.total) * 100 : 0;
            const realPct   = prog.total > 0 ? (prog.realized / prog.total) * 100 : 0;
            const openOnly  = Math.max(0, prog.open - prog.approved);
            const openPct   = prog.total > 0 ? (openOnly / prog.total) * 100 : 0;

            return (
              <div key={prog.programme} className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-6 w-12 items-center justify-center rounded-md bg-brand-50 text-[11px] font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                      {prog.programme}
                    </span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {prog.total.toLocaleString()}
                      <span className="ml-1 text-xs font-normal text-gray-400">EPs</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span className="text-blue-500">Open <strong>{prog.open}</strong></span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Approved <strong>{prog.approved}</strong>
                      <span className="text-gray-400 font-normal"> ({formatRate(approvPct)})</span>
                    </span>
                    <span className="text-violet-600 dark:text-violet-400">
                      Realized <strong>{prog.realized}</strong>
                      <span className="text-gray-400 font-normal"> ({formatRate(realPct)})</span>
                    </span>
                  </div>
                </div>
                {/* Stacked bar */}
                <div className="flex h-1.5 w-full overflow-hidden rounded-full gap-px">
                  <div className="bg-blue-400 rounded-l-full transition-all duration-700" style={{ width: `${openPct}%` }} />
                  <div className="bg-emerald-400 transition-all duration-700" style={{ width: `${approvPct}%` }} />
                  <div className="bg-violet-400 rounded-r-full transition-all duration-700" style={{ width: `${realPct}%` }} />
                </div>
              </div>
            );
          })}
          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
            {[
              { color: "bg-blue-400",    label: "Open" },
              { color: "bg-emerald-400", label: "Approved" },
              { color: "bg-violet-400",  label: "Realized" },
            ].map((l) => (
              <span key={l.label} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span className={`h-2 w-2 rounded-sm ${l.color}`} />
                {l.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
