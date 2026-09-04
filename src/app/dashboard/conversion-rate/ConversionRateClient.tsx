"use client";

import { useEffect, useState, useMemo } from "react";
import type { ExpaApplication } from "@/lib/server/expaApplicationsClient";

// ─── Status display ───────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; dot: string; priority: number }> = {
  open:                { label: "Applied",   color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",           dot: "bg-blue-400",    priority: 1 },
  accepted:            { label: "Accepted",  color: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",               dot: "bg-sky-400",     priority: 2 },
  approved:            { label: "Approved",  color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",   dot: "bg-violet-400",  priority: 3 },
  approved_ep_manager: { label: "Approved",  color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",   dot: "bg-violet-400",  priority: 3 },
  matched:             { label: "Matched",   color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",   dot: "bg-orange-400",  priority: 4 },
  realized:            { label: "Realized",  color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", dot: "bg-emerald-400", priority: 5 },
  finished:            { label: "Finished",  color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",           dot: "bg-teal-400",    priority: 6 },
  completed:           { label: "Completed", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",       dot: "bg-green-500",   priority: 7 },
};

const PROGRAMME_COLORS: Record<string, string> = {
  GTa: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  GTe: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  GV:  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

const FUNNEL = [
  { key: "applied",   label: "Applied",   statuses: ["open", "accepted"] },
  { key: "approved",  label: "Approved",  statuses: ["approved", "approved_ep_manager", "accepted"] },
  { key: "matched",   label: "Matched",   statuses: ["matched"] },
  { key: "realized",  label: "Realized",  statuses: ["realized", "finished", "completed"] },
] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function SourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  const isPhysical = source === "physical";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
      isPhysical
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
        : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
    }`}>
      {isPhysical ? "Physical" : "Digital"}
    </span>
  );
}

function ProgrammeBadge({ programme }: { programme: string }) {
  const cls = PROGRAMME_COLORS[programme] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{programme || "—"}</span>;
}

function KPI({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1.5 text-3xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
    </div>
  );
}

function formatDate(iso: string) {
  if (!iso) return "—";
  try { return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso)); }
  catch { return iso; }
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ConversionRateClient() {
  const [applications, setApplications] = useState<ExpaApplication[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [totalLeads, setTotalLeads] = useState(0);
  const [skipped, setSkipped]   = useState(0);

  // Filters
  const [search, setSearch]               = useState("");
  const [filterProgramme, setFilterProgramme] = useState("ALL");
  const [filterStatus, setFilterStatus]   = useState("ALL");
  const [filterSource, setFilterSource]   = useState("ALL");

  async function load(nocache = false) {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/expa/applications${nocache ? "?nocache=1" : ""}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Failed to load.");
      setApplications(data.applications ?? []);
      setTotalLeads(data.totalLeads ?? 0);
      setSkipped(data.skipped ?? 0);
      setFetchedAt(data.fetchedAt ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived values ────────────────────────────────────────────────────────
  const programmes = useMemo(() => {
    const s = new Set(applications.map((a) => a.programme).filter(Boolean));
    return ["ALL", ...Array.from(s).sort()];
  }, [applications]);

  const filtered = useMemo(() => {
    let list = applications;
    if (filterProgramme !== "ALL") list = list.filter((a) => a.programme === filterProgramme);
    if (filterStatus    !== "ALL") list = list.filter((a) => normalise(a.status) === filterStatus);
    if (filterSource    !== "ALL") list = list.filter((a) => a.sheetSource === filterSource);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) =>
        a.epName.toLowerCase().includes(q) ||
        a.sheetFirstName?.toLowerCase().includes(q) ||
        a.sheetLastName?.toLowerCase().includes(q)  ||
        a.sheetUniversity?.toLowerCase().includes(q) ||
        a.sheetMemberName?.toLowerCase().includes(q) ||
        a.opportunityTitle.toLowerCase().includes(q)
      );
    }
    return list;
  }, [applications, filterProgramme, filterStatus, filterSource, search]);

  // Funnel — always over full programme-filtered set (not text search)
  const funnelBase = useMemo(
    () => filterProgramme === "ALL" ? applications : applications.filter((a) => a.programme === filterProgramme),
    [applications, filterProgramme]
  );

  const funnelCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const step of FUNNEL) {
      c[step.key] = funnelBase.filter((a) => (step.statuses as readonly string[]).includes(a.status)).length;
    }
    return c;
  }, [funnelBase]);

  const uniqueEPs   = applications.length;
  const realized    = funnelCounts["realized"];
  const approved    = funnelCounts["approved"];
  const convRate    = uniqueEPs > 0 ? ((realized / uniqueEPs) * 100).toFixed(1) : "0.0";
  const approvalRate= uniqueEPs > 0 ? ((approved / uniqueEPs) * 100).toFixed(1) : "0.0";

  const statusOptions = useMemo(() => {
    const s = new Set(applications.map((a) => normalise(a.status)));
    return ["ALL", ...Array.from(s).sort()];
  }, [applications]);

  function exportCSV() {
    if (!filtered.length) return;
    const hdrs = ["EP ID", "Name", "University", "Member", "Source", "Status", "Programme", "Opportunity", "Application Date"];
    const rows = filtered.map((a) => [
      a.epId,
      `${a.sheetFirstName ?? ""} ${a.sheetLastName ?? ""}`.trim() || a.epName,
      a.sheetUniversity ?? "",
      a.sheetMemberName ?? "",
      a.sheetSource ?? "",
      a.status,
      a.programme,
      a.opportunityTitle,
      a.createdAt,
    ]);
    const csv = [hdrs, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "ep-conversion-feb2026.csv";
    link.click();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-500">Analytics</p>
            <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">EP Conversion Rate</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Leads from our sheets (from 1 Feb 2026) · live EXPA status per EP · one entry per person.
              {fetchedAt && <span className="ml-2 text-xs text-gray-400">Cached {new Date(fetchedAt).toLocaleTimeString()}</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => load(true)}
              disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {loading ? "Loading…" : "↻ Refresh"}
            </button>
            <button
              onClick={exportCSV}
              disabled={loading || !filtered.length}
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

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-20 dark:border-gray-700 dark:bg-white/[0.02]">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p className="mt-3 text-sm text-gray-400">Matching leads to EXPA statuses…</p>
            <p className="mt-1 text-xs text-gray-400">{totalLeads > 0 ? `${totalLeads} leads fetched from sheets` : "Fetching sheets…"}</p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPI label="Leads from sheets" value={totalLeads} sub={`${skipped} without EXPA ID`} />
            <KPI label="Found on EXPA" value={uniqueEPs} sub={`${totalLeads > 0 ? ((uniqueEPs / totalLeads) * 100).toFixed(0) : 0}% match rate`} />
            <KPI label="Approved+" value={approved} sub={`${approvalRate}% of found EPs`} />
            <KPI label="Realized+" value={realized} sub={`${convRate}% conversion`} />
          </div>

          {/* Funnel */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Conversion Funnel{filterProgramme !== "ALL" && <span className="ml-2 normal-case font-normal text-brand-500">· {filterProgramme}</span>}
            </h2>
            <div className="flex items-end gap-3 overflow-x-auto pb-1">
              {FUNNEL.map((step, i) => {
                const count   = funnelCounts[step.key];
                const base    = funnelCounts[FUNNEL[0].key] || 1;
                const pct     = i === 0 ? 100 : Math.round((count / base) * 100);
                const barH    = Math.max(8, Math.round(pct * 0.9));
                return (
                  <div key={step.key} className="flex flex-1 min-w-[70px] flex-col items-center gap-1">
                    {i > 0 && <span className="text-[10px] font-medium text-gray-400">{pct}%</span>}
                    <div
                      className="w-full rounded-t-lg bg-brand-500 transition-all duration-700"
                      style={{ height: `${barH}px`, opacity: 0.25 + (pct / 100) * 0.75 }}
                    />
                    <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">{count}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{step.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search name, university, member, opportunity…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[200px] rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
            <select value={filterProgramme} onChange={(e) => setFilterProgramme(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
              {programmes.map((p) => <option key={p} value={p}>{p === "ALL" ? "All Programmes" : p}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
              {statusOptions.map((s) => <option key={s} value={s}>{s === "ALL" ? "All Statuses" : (STATUS_CFG[s]?.label ?? s)}</option>)}
            </select>
            <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
              <option value="ALL">All Sources</option>
              <option value="physical">Physical</option>
              <option value="digital">Digital</option>
            </select>
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500">
            Showing {filtered.length} of {applications.length} EPs found on EXPA
          </p>

          {/* Table — desktop */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="px-4 py-3">EP</th>
                  <th className="px-4 py-3">University</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Programme</th>
                  <th className="px-4 py-3">Opportunity</th>
                  <th className="px-4 py-3">Applied</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">No EPs match the current filters.</td></tr>
                ) : filtered.map((a) => (
                  <tr key={a.epId} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 dark:text-white">
                        {`${a.sheetFirstName ?? ""} ${a.sheetLastName ?? ""}`.trim() || a.epName || "—"}
                      </p>
                      <p className="text-xs text-gray-400">ID {a.epId}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[150px] truncate">{a.sheetUniversity || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a.sheetMemberName || "—"}</td>
                    <td className="px-4 py-3"><SourceBadge source={a.sheetSource} /></td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-3"><ProgrammeBadge programme={a.programme} /></td>
                    <td className="px-4 py-3 max-w-[200px] truncate text-gray-600 dark:text-gray-400">{a.opportunityTitle || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards — mobile */}
          <div className="space-y-3 md:hidden">
            {filtered.map((a) => (
              <div key={a.epId} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-gray-800 dark:text-white">
                    {`${a.sheetFirstName ?? ""} ${a.sheetLastName ?? ""}`.trim() || a.epName || "—"}
                  </p>
                  <StatusBadge status={a.status} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{a.sheetUniversity || "—"}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{a.opportunityTitle || "—"}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ProgrammeBadge programme={a.programme} />
                  <SourceBadge source={a.sheetSource} />
                  {a.sheetMemberName && <span className="text-xs text-gray-400">{a.sheetMemberName}</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function normalise(status: string): string {
  if (status === "approved_ep_manager" || status === "accepted") return "approved";
  return status;
}
