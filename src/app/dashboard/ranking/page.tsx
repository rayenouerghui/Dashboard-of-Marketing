"use client";
import React, { useState, useMemo } from "react";
import { getAllPhysicalMembers, formatRate } from "@/data/stats";
import type { RankingEntry } from "@/data/stats";
import Badge from "@/components/ui/badge/Badge";

type SortKey = "totalSignups" | "applications" | "approvals" | "applicationRate" | "approvalRate" | "name";
type SortDir = "asc" | "desc";

function RateBar({ value, color = "blue" }: { value: number; color?: "blue" | "green" | "orange" }) {
  const bg = color === "green" ? "bg-green-500" : color === "orange" ? "bg-orange-400" : "bg-blue-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div className={`h-full rounded-full ${bg}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs tabular-nums text-gray-600 dark:text-gray-400">{formatRate(value)}</span>
    </div>
  );
}

export default function RankingPage() {
  const allMembers = useMemo(() => getAllPhysicalMembers(), []);

  const [search, setSearch] = useState("");
  const [filterActivity, setFilterActivity] = useState<"all" | "active" | "inactive">("all");
  const [sortKey, setSortKey] = useState<SortKey>("applications");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    return allMembers.filter((m) => {
      const q = search.toLowerCase();
      const matchSearch = !q || m.name.toLowerCase().includes(q);
      const matchActivity =
        filterActivity === "all" ||
        (filterActivity === "active" && m.applications > 0) ||
        (filterActivity === "inactive" && m.applications === 0);
      return matchSearch && matchActivity;
    });
  }, [allMembers, search, filterActivity]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let diff = 0;
      if (sortKey === "name") diff = a.name.localeCompare(b.name);
      else diff = (a[sortKey] as number) - (b[sortKey] as number);
      return sortDir === "asc" ? diff : -diff;
    });
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span> : <span className="ml-1 text-gray-300">↕</span>;

  const totals = useMemo(() => ({
    leads: allMembers.reduce((s, m) => s + m.totalSignups, 0),
    applications: allMembers.reduce((s, m) => s + m.applications, 0),
    approvals: allMembers.reduce((s, m) => s + m.approvals, 0),
    members: allMembers.length,
    active: allMembers.filter((m) => m.applications > 0).length,
  }), [allMembers]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Member Ranking</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Responsible members ranked by application and approval performance
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Members</p>
          <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">{totals.members}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500 dark:text-gray-400">Active Members</p>
          <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{totals.active}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Leads</p>
          <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-white">{totals.leads}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Applied</p>
          <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{totals.applications}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Approved</p>
          <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{totals.approvals}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search member name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        />
        <select
          value={filterActivity}
          onChange={(e) => setFilterActivity(e.target.value as typeof filterActivity)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          <option value="all">All Members</option>
          <option value="active">With Applications</option>
          <option value="inactive">No Applications</option>
        </select>
        <p className="text-sm text-gray-400 dark:text-gray-500 whitespace-nowrap">
          {sorted.length} member{sorted.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">#</th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                  onClick={() => toggleSort("name")}
                >
                  Member <SortIcon k="name" />
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                  onClick={() => toggleSort("totalSignups")}
                >
                  Leads <SortIcon k="totalSignups" />
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                  onClick={() => toggleSort("applications")}
                >
                  Applied <SortIcon k="applications" />
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                  onClick={() => toggleSort("approvals")}
                >
                  Approved <SortIcon k="approvals" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                  onClick={() => toggleSort("applicationRate")}
                >
                  Application Rate <SortIcon k="applicationRate" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                  onClick={() => toggleSort("approvalRate")}
                >
                  Approval Rate <SortIcon k="approvalRate" />
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                    No members match your filters.
                  </td>
                </tr>
              ) : (
                sorted.map((member, idx) => (
                  <MemberRow key={member.name} member={member} rank={idx + 1} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MemberRow({ member, rank }: { member: RankingEntry; rank: number }) {
  const isTop = rank <= 3 && member.applications > 0;
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

  return (
    <tr className="group hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
      <td className="px-4 py-3 text-sm text-gray-400 dark:text-gray-600">
        {isTop && medal ? (
          <span className="text-base">{medal}</span>
        ) : (
          <span>{rank}</span>
        )}
      </td>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-800 dark:text-white/90">{member.name}</p>
      </td>
      <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
        {member.totalSignups}
      </td>
      <td className="px-4 py-3 text-right text-sm font-semibold text-blue-600 dark:text-blue-400">
        {member.applications}
      </td>
      <td className="px-4 py-3 text-right text-sm font-semibold text-green-600 dark:text-green-400">
        {member.approvals}
      </td>
      <td className="px-4 py-3">
        <RateBar value={member.applicationRate} color="blue" />
      </td>
      <td className="px-4 py-3">
        <RateBar value={member.approvalRate} color="green" />
      </td>
      <td className="px-4 py-3 text-center">
        {member.approvals > 0 ? (
          <Badge size="sm" color="success">Converted</Badge>
        ) : member.applications > 0 ? (
          <Badge size="sm" color="primary">Applied</Badge>
        ) : (
          <Badge size="sm" color="light">Pending</Badge>
        )}
      </td>
    </tr>
  );
}
