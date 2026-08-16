"use client";

import React from "react";
import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ConversionStats, RankingEntry } from "@/data/stats";
import { formatConversionRate, formatRate } from "@/data/stats";

interface ConversionRateCardProps {
  title: string;
  subtitle?: string;
  stats: ConversionStats;
}

export function ConversionRateCard({ title, subtitle, stats }: ConversionRateCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-800 dark:text-white/90">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
        <Badge color="success" size="sm">EP Conversion</Badge>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-6">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Approval Rate</p>
          <p className="mt-1 text-3xl font-bold text-brand-600 dark:text-brand-400">
            {formatConversionRate(stats.conversionRate)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Application Rate</p>
          <p className="mt-1 text-xl font-semibold text-blue-600 dark:text-blue-400">
            {formatConversionRate(stats.applicationRate)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatPill label="Total Leads" value={stats.total} />
        <StatPill label="Applied" value={stats.applied} accent="blue" />
        <StatPill label="Approved" value={stats.approved} accent="green" />
        <StatPill label="No Application" value={stats.noApplication} accent="gray" />
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "green" | "orange" | "blue" | "gray";
}) {
  const color =
    accent === "green"
      ? "text-green-600 dark:text-green-400"
      : accent === "blue"
        ? "text-blue-600 dark:text-blue-400"
        : accent === "orange"
          ? "text-orange-600 dark:text-orange-400"
          : "text-gray-800 dark:text-white/90";

  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/[0.04]">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}

interface ApprovalRankingTableProps {
  title: string;
  subtitle?: string;
  groupLabel: string;
  rankings: RankingEntry[];
  emptyMessage?: string;
  showChannel?: boolean;
  channelByName?: Record<string, "Physical" | "Digital">;
}

export function ApprovalRankingTable({
  title,
  subtitle,
  groupLabel,
  rankings,
  emptyMessage = "No approved EPs yet.",
  showChannel = false,
  channelByName,
}: ApprovalRankingTableProps) {
  const withActivity = rankings.filter((r) => r.totalSignups > 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h3>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>

      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
            <TableRow>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">#</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">{groupLabel}</TableCell>
              {showChannel && (
                <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Channel</TableCell>
              )}
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Leads</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Applied</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Approved</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">App. Rate</TableCell>
              <TableCell isHeader className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Approval Rate</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {withActivity.length === 0 ? (
              <TableRow>
                <td colSpan={showChannel ? 8 : 7} className="py-8 text-center text-gray-400 dark:text-gray-500">
                  {emptyMessage}
                </td>
              </TableRow>
            ) : (
              withActivity.map((entry, idx) => (
                <TableRow key={`${entry.name}-${idx}`}>
                  <TableCell className="py-3 text-gray-400 text-theme-xs dark:text-gray-600">{idx + 1}</TableCell>
                  <TableCell className="py-3 font-medium text-gray-800 text-theme-sm dark:text-white/90">{entry.name}</TableCell>
                  {showChannel && (
                    <TableCell className="py-3">
                      <Badge size="sm" color={channelByName?.[entry.name] === "Digital" ? "primary" : "success"}>
                        {channelByName?.[entry.name] ?? "—"}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">{entry.totalSignups}</TableCell>
                  <TableCell className="py-3 text-blue-600 text-theme-sm font-semibold dark:text-blue-400">{entry.applications}</TableCell>
                  <TableCell className="py-3 text-green-600 text-theme-sm font-semibold dark:text-green-400">{entry.approvals}</TableCell>
                  <TableCell className="py-3">
                    <Badge size="sm" color={entry.applicationRate > 0 ? "primary" : "light"}>
                      {formatRate(entry.applicationRate)}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge size="sm" color={entry.approvals > 0 ? "success" : entry.applications > 0 ? "warning" : "light"}>
                      {formatRate(entry.approvalRate)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
