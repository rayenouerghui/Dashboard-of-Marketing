"use client";
import React, { useState, useMemo } from "react";
import {
  Table, TableBody, TableCell, TableHeader, TableRow,
} from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import { getDigitalLeads, Lead } from "@/lib/dataUtils";

const PAGE_SIZES = [25, 50, 100];

export default function LeadsPage() {
  const allLeads = getDigitalLeads();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Unique internship types
  const internshipTypes = useMemo(() => {
    const types = new Set<string>();
    allLeads.forEach((l) =>
      l.internshipType.split(",").forEach((t) => types.add(t.trim()))
    );
    return [...types].filter(Boolean).sort();
  }, [allLeads]);

  const filtered = useMemo(() => {
    return allLeads.filter((lead: Lead) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        lead.firstName.toLowerCase().includes(q) ||
        lead.lastName.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        lead.university.toLowerCase().includes(q) ||
        lead.phone.includes(q);

      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "created" && lead.accountStatus.includes("✅")) ||
        (filterStatus === "existing" && lead.accountStatus.includes("⚠️"));

      const matchType =
        filterType === "all" || lead.internshipType.includes(filterType);

      return matchSearch && matchStatus && matchType;
    });
  }, [allLeads, search, filterStatus, filterType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  function handleFilterChange(setter: (v: string) => void, val: string) {
    setter(val);
    setPage(1);
  }

  // Stats
  const created = filtered.filter((l) => l.accountStatus.includes("✅")).length;
  const existing = filtered.filter((l) => l.accountStatus.includes("⚠️")).length;
  const successRate = filtered.length > 0 ? ((created / filtered.length) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Digital Leads</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          All leads collected via the Digital sign-up form
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total (filtered)</p>
          <p className="mt-1 text-xl font-bold text-gray-800 dark:text-white">{filtered.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500 dark:text-gray-400">Accounts Created</p>
          <p className="mt-1 text-xl font-bold text-green-600 dark:text-green-400">{created}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500 dark:text-gray-400">Existing Accounts</p>
          <p className="mt-1 text-xl font-bold text-orange-600 dark:text-orange-400">{existing}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500 dark:text-gray-400">Success Rate</p>
          <p className="mt-1 text-xl font-bold text-brand-600 dark:text-brand-400">{successRate}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search name, email, university, phone…"
          value={search}
          onChange={(e) => handleFilterChange(setSearch, e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        />
        <select
          value={filterStatus}
          onChange={(e) => handleFilterChange(setFilterStatus, e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          <option value="all">All Statuses</option>
          <option value="created">Account Created ✅</option>
          <option value="existing">Already Exists ⚠️</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => handleFilterChange(setFilterType, e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          <option value="all">All Types</option>
          {internshipTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>{s} / page</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
              <TableRow>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">#</TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Name</TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Email</TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Phone</TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">University</TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Internship Type</TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Referral</TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Status</TableCell>
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Date</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell className="py-8 text-center text-gray-400 dark:text-gray-500" colSpan={9}>
                    No leads match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((lead: Lead, idx: number) => (
                  <TableRow key={lead.submissionId}>
                    <TableCell className="py-3 text-gray-400 text-theme-xs dark:text-gray-600">
                      {(page - 1) * pageSize + idx + 1}
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {lead.firstName} {lead.lastName}
                      </p>
                    </TableCell>
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {lead.email}
                    </TableCell>
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {lead.phone || "—"}
                    </TableCell>
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400 max-w-[200px] truncate">
                      {lead.university.split(":")[0].trim()}
                    </TableCell>
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      <div className="flex flex-wrap gap-1">
                        {lead.internshipType.split(",").map((t) => (
                          <span
                            key={t}
                            className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                          >
                            {t.trim().replace(" Internship", "")}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {lead.referral}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge size="sm" color={lead.accountStatus.includes("✅") ? "success" : "warning"}>
                        {lead.accountStatus.includes("✅") ? "Created" : "Exists"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400 whitespace-nowrap">
                      {new Date(lead.submittedAt).toLocaleDateString("en-GB")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing {Math.min((page - 1) * pageSize + 1, filtered.length)}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} leads
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            ← Previous
          </button>
          {/* Page number pills */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 2, totalPages - 4));
            const p = start + i;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  page === p
                    ? "bg-brand-500 text-white"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
