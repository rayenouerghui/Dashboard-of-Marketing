"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import type { ExpaLeadStats } from "@/app/api/expa/leads/route";
import type { ExpaApplication } from "@/lib/server/expaApplicationsClient";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; dot: string }> = {
  open:                { label: "Applied",   color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",           dot: "bg-blue-400"    },
  accepted:            { label: "Accepted",  color: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",               dot: "bg-sky-400"     },
  approved:            { label: "Approved",  color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",   dot: "bg-violet-400"  },
  approved_ep_manager: { label: "Approved",  color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",   dot: "bg-violet-400"  },
  matched:             { label: "Matched",   color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",   dot: "bg-orange-400"  },
  realized:            { label: "Realized",  color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", dot: "bg-emerald-400" },
  finished:            { label: "Finished",  color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",           dot: "bg-teal-400"    },
  completed:           { label: "Completed", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",       dot: "bg-green-500"   },
};

const PROG_COLOR: Record<string, string> = {
  GTa: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  GTe: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  GV:  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

function pct(n: number) { return `${n.toFixed(1)}%`; }

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function ProgBadge({ prog }: { prog: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PROG_COLOR[prog] ?? "bg-gray-100 text-gray-600"}`}>{prog || "—"}</span>;
}

function formatDate(iso: string) {
  if (!iso) return "—";
  try { return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso)); }
  catch { return iso; }
}

function RatePill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-3xl font-black tabular-nums">{pct(value)}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ConversionRateClient() {
  const [leadsStats, setLeadsStats]  = useState<ExpaLeadStats | null>(null);
  const [applications, setApplications] = useState<ExpaApplication[]>([]);
  const [loading, setLoading]        = useState(true);
  const [error, setError]            = useState<string | null>(null);
  const [search, setSearch]          = useState("");
  const [filterProg, setFilterProg]  = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const load = useCallback(async (nocache = false) => {
    setLoading(true);
    setError(null);
    try {
      const [leadsRes, appsRes] = await Promise.all([
        fetch(`/api/expa/leads${nocache ? "?nocache=1" : ""}&full=1`),
        fetch(`/api/expa/applications${nocache ? "?nocache=1" : ""}`),
      ]);
      const [leadsData, appsData] = await Promise.all([leadsRes.json(), appsRes.json()]);
      if (!leadsRes.ok || !leadsData.success) throw new Error(leadsData.error ?? "Failed to load leads.");
      setLeadsStats(leadsData.stats);
      if (appsData.success) setApplications(appsData.applications ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30 minutes (matches cache duration)
  useEffect(() => {
    const interval = setInterval(() => load(), 1800000);
    return () => clearInterval(interval);
  }, [load]);

  const programmes = useMemo(() => {
    const s = new Set(applications.map((a) => a.programme).filter(Boolean));
    return ["ALL", ...Array.from(s).sort()];
  }, [applications]);

  const statusOptions = useMemo(() => {
    const s = new Set(applications.map((a) => normalise(a.status)));
    return ["ALL", ...Array.from(s).sort()];
  }, [applications]);

  const filtered = useMemo(() => {
    let list = applications;
    if (filterProg !== "ALL")   list = list.filter((a) => a.programme === filterProg);
    if (filterStatus !== "ALL") list = list.filter((a) => normalise(a.status) === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) =>
        a.epName.toLowerCase().includes(q) ||
        a.sheetFirstName?.toLowerCase().includes(q) ||
        a.sheetLastName?.toLowerCase().includes(q)  ||
        a.sheetUniversity?.toLowerCase().includes(q) ||
        a.opportunityTitle.toLowerCase().includes(q)
      );
    }
    return list;
  }, [applications, filterProg, filterStatus, search]);

  function exportCSV() {
    if (!filtered.length) return;
    const hdrs = ["EP ID", "Name", "University", "Status", "Programme", "Opportunity", "Applied"];
    const rows = filtered.map((a) => [
      a.epId,
      `${a.sheetFirstName ?? ""} ${a.sheetLastName ?? ""}`.trim() || a.epName,
      a.sheetUniversity ?? "", a.status, a.programme, a.opportunityTitle, a.createdAt,
    ]);
    const csv = [hdrs, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "ep-conversion.csv";
    link.click();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-500">Analytics · EXPA</p>
            <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">Conversion Rate</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Sign-up → Applied → Approved → Realized · from Feb 2026 · one entry per EP.
              {leadsStats?.computedAt && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-gray-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {new Date(leadsStats.computedAt).toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => load(true)} disabled={loading} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {loading ? "Loading…" : "↻ Refresh"}
            </button>
            <button onClick={exportCSV} disabled={loading || !filtered.length} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50">
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{error}</div>
      )}

      {loading && !leadsStats ? (
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-20 dark:border-gray-700 dark:bg-white/[0.02]">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="mt-3 text-sm text-gray-400">Fetching from EXPA…</p>
          </div>
        </div>
      ) : leadsStats && (
        <>
          {/* Conversion rate pills */}
          <div className="grid gap-4 sm:grid-cols-3">
            <RatePill
              label="Sign-Up → Applied"
              value={leadsStats.signupToApplied}
              color="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200"
            />
            <RatePill
              label="Applied → Approved"
              value={leadsStats.appliedToApproved}
              color="border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-700 dark:bg-violet-900/20 dark:text-violet-200"
            />
            <RatePill
              label="Approved → Realized"
              value={leadsStats.approvedToRealized}
              color="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200"
            />
          </div>

          {/* Funnel counts */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { l: "Total Sign-Ups", v: leadsStats.totalLeads,  c: "text-gray-800 dark:text-white" },
              { l: "Applied",        v: leadsStats.applied,     c: "text-blue-600 dark:text-blue-400" },
              { l: "Approved",       v: leadsStats.approved,    c: "text-violet-600 dark:text-violet-400" },
              { l: "Realized",       v: leadsStats.realized,    c: "text-emerald-600 dark:text-emerald-400" },
            ].map(({ l, v, c }) => (
              <div key={l} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{l}</p>
                <p className={`mt-1.5 text-3xl font-bold tabular-nums ${c}`}>{v.toLocaleString()}</p>
              </div>
            ))}
          </div>


          {/* EP table */}
          <div className="flex flex-wrap gap-3">
            <input
              type="text" placeholder="Search EP name, university, opportunity…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[200px] rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
            <select value={filterProg} onChange={(e) => setFilterProg(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
              {programmes.map((p) => <option key={p} value={p}>{p === "ALL" ? "All Programmes" : p}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
              {statusOptions.map((s) => <option key={s} value={s}>{s === "ALL" ? "All Statuses" : (STATUS_CFG[s]?.label ?? s)}</option>)}
            </select>
          </div>
          <p className="text-xs text-gray-400">{filtered.length} of {applications.length} EPs</p>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  {["EP", "Status", "Programme", "Opportunity", "Applied"].map((h) => (
                    <th key={h} className="px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No EPs match the filters.</td></tr>
                ) : filtered.map((a) => (
                  <tr key={a.applicationId} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 dark:text-white">{`${a.sheetFirstName ?? ""} ${a.sheetLastName ?? ""}`.trim() || a.epName || "—"}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[160px]">{a.epEmail}</p>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-3"><ProgBadge prog={a.programme} /></td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-gray-600 dark:text-gray-400">{a.opportunityTitle || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((a) => (
              <div key={a.applicationId} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-gray-800 dark:text-white truncate">{`${a.sheetFirstName ?? ""} ${a.sheetLastName ?? ""}`.trim() || a.epName || "—"}</p>
                  <StatusBadge status={a.status} />
                </div>
                <p className="text-xs text-gray-500 truncate">{a.opportunityTitle || "—"}</p>
                <div className="mt-2 flex items-center gap-2">
                  <ProgBadge prog={a.programme} />
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

function normalise(s: string) {
  return s === "approved_ep_manager" || s === "accepted" ? "approved" : s;
}
