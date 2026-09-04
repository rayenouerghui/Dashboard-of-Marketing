"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import type { SubmissionRecord } from "@/lib/submissionsStore";

// ─── Config ───────────────────────────────────────────────────────────────────
export type SheetType = "OGV" | "OGT";

const SHEET_CONFIG: Record<SheetType, {
  label:       string;
  accent:      string;   // Tailwind text colour
  border:      string;   // Tailwind border colour
  bg:          string;   // header bg tint
  dotBg:       string;   // live dot colour
  logo:        string;   // /public path
  exportName:  string;
}> = {
  OGV: {
    label:      "Submissions OGV",
    accent:     "text-rose-600 dark:text-rose-400",
    border:     "border-rose-200 dark:border-rose-800",
    bg:         "bg-rose-50 dark:bg-rose-900/10",
    dotBg:      "bg-rose-500",
    logo:       "/images/products/gv.png",
    exportName: "submissions-ogv",
  },
  OGT: {
    label:      "Submissions OGT",
    accent:     "text-blue-600 dark:text-blue-400",
    border:     "border-blue-200 dark:border-blue-800",
    bg:         "bg-blue-50 dark:bg-blue-900/10",
    dotBg:      "bg-blue-500",
    logo:       "/images/products/gta.png",
    exportName: "submissions-ogt",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso));
  } catch { return iso; }
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={copy}
      title="Copy"
      className="ml-1.5 shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
    >
      {copied
        ? <span className="text-[10px] font-semibold text-emerald-500">✓</span>
        : <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
      }
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SubmissionsViewer({ sheet }: { sheet: SheetType }) {
  const cfg = SHEET_CONFIG[sheet];
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/submissions?sheet=${sheet}`);
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.submissions ?? []);
        setLastRefresh(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, [sheet]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30 s
  useEffect(() => {
    const id = setInterval(fetchData, 30_000);
    return () => clearInterval(id);
  }, [fetchData]);

  const filtered = submissions.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.epName.toLowerCase().includes(q) ||
      s.opportunityTitle.toLowerCase().includes(q) ||
      s.universityName.toLowerCase().includes(q) ||
      s.product.toLowerCase().includes(q) ||
      s.condition.toLowerCase().includes(q)
    );
  });

  function exportCSV() {
    if (!filtered.length) return;
    const hdrs = ["Date", "EP Name", "Product", "Opportunity", "University", "Country", "Duration", "Condition / Note"];
    const rows = filtered.map((s) => [
      formatDate(s.submittedAt), s.epName, s.product, s.opportunityTitle,
      s.universityName, s.country, s.duration, s.condition || s.note,
    ]);
    const csv = [hdrs, ...rows].map((r) =>
      r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `${cfg.exportName}.csv`;
    link.click();
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src={cfg.logo}
              alt={sheet}
              width={40}
              height={40}
              className="rounded-lg object-contain"
            />
            <div>
              <h1 className={`text-2xl font-bold ${cfg.accent}`}>{cfg.label}</h1>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                {submissions.length} response{submissions.length !== 1 ? "s" : ""}
                {lastRefresh && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs text-gray-400">
                    <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotBg} animate-pulse`} />
                    live · {lastRefresh.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {loading ? "Refreshing…" : "↻ Refresh"}
            </button>
            <button
              onClick={exportCSV}
              disabled={!filtered.length}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-40"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search EP name, opportunity, university…"
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
      />

      {/* Content */}
      {loading && submissions.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 dark:border-gray-700 dark:bg-white/[0.02]">
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 dark:border-gray-700 dark:bg-white/[0.02]">
          <span className="text-4xl">📋</span>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {search ? "No submissions match your search." : "No submissions yet."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table — read-only, selectable text, copy buttons */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <table className="w-full select-text text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">EP Name</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Opportunity</th>
                  <th className="px-4 py-3">University</th>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(s.submittedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-gray-800 dark:text-white">{s.epName || "—"}</span>
                        {s.epName && <CopyButton value={s.epName} />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {s.product || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-[200px] items-center gap-1">
                        <span className="truncate text-gray-700 dark:text-gray-300">{s.opportunityTitle || "—"}</span>
                        {s.opportunityTitle && <CopyButton value={s.opportunityTitle} />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.universityName || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.country || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.duration || "—"}</td>
                    <td className="max-w-[160px] px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="truncate text-gray-600 dark:text-gray-400">{s.condition || s.note || "—"}</span>
                        {(s.condition || s.note) && <CopyButton value={s.condition || s.note} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((s) => (
              <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="font-semibold text-gray-800 dark:text-white truncate">{s.epName || "—"}</span>
                    {s.epName && <CopyButton value={s.epName} />}
                  </div>
                  <span className="shrink-0 inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {s.product}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{s.opportunityTitle || "—"}</p>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>🏫 {s.universityName || "—"}</span>
                  <span>🌍 {s.country || "—"}</span>
                  <span>⏱️ {s.duration || "—"}</span>
                  <span>📅 {formatDate(s.submittedAt)}</span>
                </div>
                {(s.condition || s.note) && (
                  <div className="mt-2 flex items-start gap-1 text-xs text-gray-400 dark:text-gray-500">
                    <span className="line-clamp-2">📝 {s.condition || s.note}</span>
                    <CopyButton value={s.condition || s.note} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
