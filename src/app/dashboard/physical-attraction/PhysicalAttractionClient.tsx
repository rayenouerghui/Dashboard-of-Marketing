"use client";
import React, { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import { getPhysicalUniversityStats, getPhysicalConversionStats, formatRate } from "@/data/stats";
import { PhysicalAttractionLead } from "@/lib/dataUtils";

const PAGE_SIZES = [25, 50, 100];
type View = "leads" | "universities";

interface PhysicalAttractionClientProps {
  initialLeads: PhysicalAttractionLead[];
}

function RateBar({ value, color = "blue" }: { value: number; color?: "blue" | "green" }) {
  const bg = color === "green" ? "bg-green-500" : "bg-blue-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div className={`h-full rounded-full ${bg}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs tabular-nums">{formatRate(value)}</span>
    </div>
  );
}

export default function PhysicalAttractionClient({ initialLeads }: PhysicalAttractionClientProps) {
  const allLeads = initialLeads;
  const universityStats = useMemo(() => getPhysicalUniversityStats(), []);

  const [view, setView] = useState<View>("leads");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [uniSearch, setUniSearch] = useState("");
  const [uniSort, setUniSort] = useState<"total" | "applicationRate" | "approvalRate">("total");

  const filteredLeads = useMemo(
    () =>
      allLeads.filter((lead: PhysicalAttractionLead) => {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          !q ||
          lead.firstName.toLowerCase().includes(q) ||
          lead.lastName.toLowerCase().includes(q) ||
          lead.email.toLowerCase().includes(q) ||
          lead.university.toLowerCase().includes(q);
        const matchesStatus =
          filterStatus === "all" ||
          (filterStatus === "created" && lead.accountStatus.includes("check")) ||
          (filterStatus === "existing" && lead.accountStatus.includes("warning"));
        const matchesLevel = filterLevel === "all" || lead.universityLevel === filterLevel;
        return matchesSearch && matchesStatus && matchesLevel;
      }),
    [allLeads, searchTerm, filterStatus, filterLevel]
  );

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const paginatedLeads = filteredLeads.slice((page - 1) * pageSize, page * pageSize);
  const universityLevels = useMemo(
    () => [...new Set(allLeads.map((l) => l.universityLevel))].filter(Boolean).sort(),
    [allLeads]
  );

  const filteredUnis = useMemo(() => {
    const q = uniSearch.toLowerCase();
    const list = q ? universityStats.filter((u) => u.name.toLowerCase().includes(q)) : universityStats;
    return [...list].sort((a, b) => {
      if (uniSort === "applicationRate") return b.applicationRate - a.applicationRate;
      if (uniSort === "approvalRate") return b.approvalRate - a.approvalRate;
      return b.total - a.total;
    });
  }, [universityStats, uniSearch, uniSort]);

  function reset<T>(setter: (v: T) => void, val: T) { setter(val); setPage(1); }

  const stats = {
    total: allLeads.length,
    created: allLeads.filter((l) => l.accountStatus.includes("Account created")).length,
    existing: allLeads.filter((l) => l.accountStatus.includes("already exists")).length,
  };
  const physicalStats = getPhysicalConversionStats();
  const successRate = physicalStats.conversionRate.toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-500 dark:text-brand-400">
            Attraction overview
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">Physical Attractions</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Leads from physical attraction campaigns</p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          {filteredLeads.length} active leads
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Total Leads</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">New Accounts</p>
          <p className="mt-2 text-2xl font-bold text-green-600 dark:text-green-400">{stats.created}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">Existing Accounts</p>
          <p className="mt-2 text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.existing}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex gap-1">
          {(["leads", "universities"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium capitalize transition-all ${
                view === v
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/80"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "universities" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] sm:flex-row sm:items-center">
            <input
              type="text"
              placeholder="Search university..."
              value={uniSearch}
              onChange={(e) => setUniSearch(e.target.value)}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder:text-gray-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
            />
            <select
              value={uniSort}
              onChange={(e) => setUniSort(e.target.value as typeof uniSort)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
            >
              <option value="total">Sort by Leads</option>
              <option value="applicationRate">Sort by Application Rate</option>
              <option value="approvalRate">Sort by Approval Rate</option>
            </select>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
                  <TableRow>
                    <TableCell isHeader className="py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">#</TableCell>
                    <TableCell isHeader className="py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">University</TableCell>
                    <TableCell isHeader className="py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">Leads</TableCell>
                    <TableCell isHeader className="py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">Applied</TableCell>
                    <TableCell isHeader className="py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">Approved</TableCell>
                    <TableCell isHeader className="py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">Application Rate</TableCell>
                    <TableCell isHeader className="py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400 text-start">Approval Rate</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredUnis.map((uni, idx) => (
                    <TableRow key={uni.name}>
                      <TableCell className="py-3 text-gray-400 text-theme-xs dark:text-gray-600">{idx + 1}</TableCell>
                      <TableCell className="py-3">
                        <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{uni.shortName}</p>
                        <p className="max-w-xs truncate text-xs text-gray-400 dark:text-gray-500">{uni.name}</p>
                      </TableCell>
                      <TableCell className="py-3 text-gray-600 text-theme-sm dark:text-gray-400">{uni.total}</TableCell>
                      <TableCell className="py-3 text-blue-600 text-theme-sm font-semibold dark:text-blue-400">{uni.applications}</TableCell>
                      <TableCell className="py-3 text-green-600 text-theme-sm font-semibold dark:text-green-400">{uni.approvals}</TableCell>
                      <TableCell className="py-3"><RateBar value={uni.applicationRate} color="blue" /></TableCell>
                      <TableCell className="py-3"><RateBar value={uni.approvalRate} color="green" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {view === "leads" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] sm:flex-row sm:items-center">
            <input
              type="text"
              placeholder="Search name, email, university..."
              value={searchTerm}
              onChange={(e) => reset(setSearchTerm, e.target.value)}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder:text-gray-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
            />
            <select
              value={filterStatus}
              onChange={(e) => reset(setFilterStatus, e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
            >
              <option value="all">All Status</option>
              <option value="created">Created</option>
              <option value="existing">Exists</option>
            </select>
            <select
              value={filterLevel}
              onChange={(e) => reset(setFilterLevel, e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
            >
              <option value="all">All Levels</option>
              {universityLevels.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
            >
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
            </select>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            {filteredLeads.length} result{filteredLeads.length !== 1 ? "s" : ""} — conversion rate:{" "}
            <strong className="text-gray-700 dark:text-gray-200">{successRate}%</strong>
          </p>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
                  <TableRow>
                    <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Name</TableCell>
                    <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Email</TableCell>
                    <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">University</TableCell>
                    <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Level</TableCell>
                    <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Internship</TableCell>
                    <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Member</TableCell>
                    <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                    <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paginatedLeads.map((lead: PhysicalAttractionLead) => (
                    <TableRow key={lead.submissionId}>
                      <TableCell className="py-3">
                        <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{lead.firstName} {lead.lastName}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{lead.phone}</p>
                      </TableCell>
                      <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">{lead.email}</TableCell>
                      <TableCell className="py-3 max-w-[160px] text-gray-500 text-theme-sm dark:text-gray-400">
                        <span title={lead.university}>{lead.university.split(":")[0].trim()}</span>
                      </TableCell>
                      <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">{lead.universityLevel}</TableCell>
                      <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">{lead.internshipType}</TableCell>
                      <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">{lead.memberName || "—"}</TableCell>
                      <TableCell className="py-3">
                        <Badge size="sm" color={lead.accountStatus.includes("created") ? "success" : "warning"}>
                          {lead.accountStatus.includes("created") ? "Created" : "Exists"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 whitespace-nowrap text-gray-500 text-theme-sm dark:text-gray-400">
                        {new Date(lead.submittedAt).toLocaleDateString("en-GB")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {Math.min((page - 1) * pageSize + 1, filteredLeads.length)}-{Math.min(page * pageSize, filteredLeads.length)} of {filteredLeads.length}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                Prev
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const p = start + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ${page === p ? "bg-brand-500 text-white" : "border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
