"use client";

import { useState, useEffect, useCallback } from "react";
import type { SubmissionRecord } from "@/lib/submissionsStore";

// ─── PIN codes ────────────────────────────────────────────────────────────────
// OGV = 12345   |   OGTa / OGTe = 012345
const SHEET_PINS: Record<string, { sheet: "OGV" | "OGT"; label: string }> = {
  "12345":  { sheet: "OGV", label: "OGV Sheet"  },
  "012345": { sheet: "OGT", label: "OGTa / OGTe Sheet" },
};

function formatDate(iso: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day:    "2-digit",
      month:  "short",
      year:   "numeric",
      hour:   "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const PRODUCT_COLORS: Record<string, string> = {
  GTa: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  GTe: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  GV:  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

function ProductBadge({ product }: { product: string }) {
  const cls = PRODUCT_COLORS[product] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {product || "—"}
    </span>
  );
}

export default function SubmissionsClient() {
  const [pin, setPin]               = useState("");
  const [pinInput, setPinInput]     = useState("");
  const [pinError, setPinError]     = useState("");
  const [sheetLabel, setSheetLabel] = useState("");
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchSubmissions = useCallback(async (currentPin: string) => {
    if (!currentPin) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/submissions?pin=${encodeURIComponent(currentPin)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPinError(data.error ?? "Invalid PIN.");
        setPin("");
        return;
      }
      setSubmissions(data.submissions ?? []);
      setLastRefresh(new Date());
    } catch {
      setPinError("Could not reach the server.");
      setPin("");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 30 s while unlocked
  useEffect(() => {
    if (!pin) return;
    const id = setInterval(() => fetchSubmissions(pin), 30_000);
    return () => clearInterval(id);
  }, [pin, fetchSubmissions]);

  function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPinError("");
    const meta = SHEET_PINS[pinInput.trim()];
    if (!meta) {
      setPinError("Incorrect PIN. Please try again.");
      return;
    }
    setPin(pinInput.trim());
    setSheetLabel(meta.label);
    fetchSubmissions(pinInput.trim());
  }

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

  // ── PIN gate ────────────────────────────────────────────────────────────────
  if (!pin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-7 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-6 text-center">
            <span className="text-4xl">🔒</span>
            <h1 className="mt-3 text-xl font-semibold text-gray-800 dark:text-white">
              Submissions Viewer
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enter your sheet PIN to view form responses.
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                PIN
              </label>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => { setPinInput(e.target.value); setPinError(""); }}
                placeholder="Enter PIN"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                autoFocus
              />
            </div>

            {pinError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">
                {pinError}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Submissions table ───────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Submissions — {sheetLabel}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {submissions.length} total response{submissions.length !== 1 ? "s" : ""}
            {lastRefresh && (
              <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                · refreshed {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchSubmissions(pin)}
            disabled={loading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {loading ? "Refreshing…" : "↻ Refresh"}
          </button>
          <button
            onClick={() => { setPin(""); setPinInput(""); setSubmissions([]); }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Lock
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by EP name, opportunity, university…"
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
      />

      {/* Content */}
      {loading && submissions.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 dark:border-gray-700 dark:bg-white/[0.02]">
          <p className="text-sm text-gray-400">Loading submissions…</p>
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
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">EP Name</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Opportunity</th>
                  <th className="px-4 py-3">University</th>
                  <th className="px-4 py-3">Country</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Condition / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(s.submittedAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                      {s.epName || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <ProductBadge product={s.product} />
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-gray-700 dark:text-gray-300">
                      {s.opportunityTitle || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {s.universityName || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {s.country || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {s.duration || "—"}
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-gray-600 dark:text-gray-400">
                      {s.condition || s.note || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="font-semibold text-gray-800 dark:text-white">{s.epName || "—"}</span>
                  <ProductBadge product={s.product} />
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{s.opportunityTitle || "—"}</p>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>🏫 {s.universityName || "—"}</span>
                  <span>🌍 {s.country || "—"}</span>
                  <span>⏱️ {s.duration || "—"}</span>
                  <span>📅 {formatDate(s.submittedAt)}</span>
                </div>
                {(s.condition || s.note) && (
                  <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 line-clamp-2">
                    📝 {s.condition || s.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
