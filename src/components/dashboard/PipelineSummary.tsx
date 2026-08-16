"use client";

import React from "react";
import Link from "next/link";
import { getPipelineStats, getPipelineByProgramme, formatRate } from "@/data/stats";

export default function PipelineSummary() {
  const p = getPipelineStats();
  const byProg = getPipelineByProgramme();

  const kpis = [
    {
      label: "Total Leads",
      value: p.totalLeads.toLocaleString(),
      sub: "all time",
      color: "text-gray-800 dark:text-white",
      bg: "bg-gray-50 dark:bg-white/[0.04]",
      border: "border-gray-200 dark:border-gray-700",
    },
    {
      label: "Unique Applicants",
      value: p.uniqueEPs.toLocaleString(),
      sub: `${formatRate((p.uniqueEPs / p.totalLeads) * 100)} of leads`,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-500/[0.08]",
      border: "border-blue-200 dark:border-blue-500/30",
    },
    {
      label: "Open / Active",
      value: p.open.toLocaleString(),
      sub: `${formatRate((p.open / p.totalLeads) * 100)} of leads`,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-500/[0.08]",
      border: "border-blue-200 dark:border-blue-500/30",
    },
    {
      label: "Approved",
      value: p.approved.toLocaleString(),
      sub: formatRate(p.approvalRate),
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-500/[0.08]",
      border: "border-emerald-200 dark:border-emerald-500/30",
    },
    {
      label: "Realized",
      value: p.realized.toLocaleString(),
      sub: formatRate(p.realizationRate),
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-500/[0.08]",
      border: "border-violet-200 dark:border-violet-500/30",
    },
    {
      label: "Rejected",
      value: p.rejected.toLocaleString(),
      sub: `${formatRate((p.rejected / p.totalLeads) * 100)} of leads`,
      color: "text-red-500 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-500/[0.08]",
      border: "border-red-200 dark:border-red-500/30",
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
            EXPA Application Pipeline
          </p>
          <h2 className="mt-1 text-lg font-semibold text-gray-800 dark:text-white/90">
            Conversion Overview
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {p.totalLeads.toLocaleString()} total leads · {p.uniqueEPs.toLocaleString()} unique applicants · Approval rate{" "}
            <strong className="text-emerald-600 dark:text-emerald-400">{formatRate(p.approvalRate)}</strong>
            {" "}· Realization rate{" "}
            <strong className="text-violet-600 dark:text-violet-400">{formatRate(p.realizationRate)}</strong>
          </p>
        </div>
        <Link
          href="/dashboard/conversion-rate"
          className="text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 transition-colors"
        >
          Full report →
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <div
            key={k.label}
            className={`rounded-xl border px-3 py-3 ${k.bg} ${k.border}`}
          >
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">{k.label}</p>
            <p className={`mt-1.5 text-2xl font-bold tabular-nums leading-none ${k.color}`}>
              {k.value}
            </p>
            <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Programme breakdown bar */}
      <div className="mt-5 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          By Programme
        </p>
        {byProg.map((prog) => {
          const openPct   = prog.total > 0 ? (prog.open      / prog.total) * 100 : 0;
          const approvPct = prog.total > 0 ? (prog.approved  / prog.total) * 100 : 0;
          const realPct   = prog.total > 0 ? (prog.realized  / prog.total) * 100 : 0;
          const rejPct    = prog.total > 0 ? (prog.rejected  / prog.total) * 100 : 0;
          const wdPct     = prog.total > 0 ? (prog.withdrawn / prog.total) * 100 : 0;

          return (
            <div key={prog.programme} className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]">
              <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-6 w-12 items-center justify-center rounded-md bg-brand-50 text-[11px] font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                    {prog.programme}
                  </span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {prog.uniqueEPs.toLocaleString()}
                    <span className="ml-1 text-xs font-normal text-gray-400">unique EPs</span>
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({formatRate(prog.conversionRate)} of leads)
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span className="text-blue-500">
                    Open <strong>{prog.open}</strong>
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Approved <strong>{prog.approved}</strong>
                    <span className="text-gray-400 dark:text-gray-500 font-normal"> ({formatRate(approvPct)})</span>
                  </span>
                  <span className="text-violet-600 dark:text-violet-400">
                    Realized <strong>{prog.realized}</strong>
                    <span className="text-gray-400 dark:text-gray-500 font-normal"> ({formatRate(realPct)})</span>
                  </span>
                  <span className="text-red-500 dark:text-red-400">
                    Rejected <strong>{prog.rejected}</strong>
                  </span>
                  <span className="text-orange-500 dark:text-orange-400">
                    Withdrawn <strong>{prog.withdrawn}</strong>
                  </span>
                </div>
              </div>
              {/* Stacked progress bar */}
              <div className="flex h-1.5 w-full overflow-hidden rounded-full gap-px">
                <div className="bg-blue-400 rounded-l-full" style={{ width: `${openPct}%` }} />
                <div className="bg-emerald-400" style={{ width: `${approvPct}%` }} />
                <div className="bg-violet-400" style={{ width: `${realPct}%` }} />
                <div className="bg-red-400" style={{ width: `${rejPct}%` }} />
                <div className="bg-orange-300 rounded-r-full" style={{ width: `${wdPct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {[
          { color: "bg-blue-400",    label: "Open" },
          { color: "bg-emerald-400", label: "Approved" },
          { color: "bg-violet-400",  label: "Realized" },
          { color: "bg-red-400",     label: "Rejected" },
          { color: "bg-orange-300",  label: "Withdrawn" },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span className={`h-2 w-2 rounded-sm ${l.color}`} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
