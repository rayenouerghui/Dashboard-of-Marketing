"use client";
import React from "react";
import Badge from "../ui/badge/Badge";
import { ArrowUpIcon, BoxIconLine, GroupIcon, UserCircleIcon, CheckCircleIcon } from "@/icons";
import type { AttractionLeadStats } from "@/app/api/attraction-leads/route";

interface Props { stats: AttractionLeadStats; loading?: boolean; }

function Skeleton() {
  return <div className="h-8 w-20 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />;
}

export const EcommerceMetrics = ({ stats, loading }: Props) => {
  const { byProgramme } = stats;
  const programmeCount = byProgramme.length;
  const topProgramme = byProgramme[0];
  const topProgrammeName = topProgramme?.programme ?? "—";
  const topProgrammeCount = topProgramme?.total ?? 0;

  const cards = [
    {
      icon:  <GroupIcon className="text-blue-600 size-6 dark:text-blue-400" />,
      bg:    "bg-blue-100 dark:bg-blue-900/20",
      label: "Total Leads",
      value: stats.totalLeads,
      badge: `${stats.leadsToday} today`,
      bColor: "success" as const,
    },
    {
      icon:  <CheckCircleIcon className="text-cyan-600 size-6 dark:text-cyan-400" />,
      bg:    "bg-cyan-100 dark:bg-cyan-900/20",
      label: "Programmes",
      value: programmeCount,
      badge: "active",
      bColor: "primary" as const,
    },
    {
      icon:  <UserCircleIcon className="text-orange-600 size-6 dark:text-orange-400" />,
      bg:    "bg-orange-100 dark:bg-orange-900/20",
      label: "Top Programme",
      value: topProgrammeName,
      badge: `${topProgrammeCount} leads`,
      bColor: "warning" as const,
    },
    {
      icon:  <BoxIconLine className="text-rose-600 size-6 dark:text-rose-400" />,
      bg:    "bg-rose-100 dark:bg-rose-900/20",
      label: "This Week",
      value: stats.leadsThisWeek,
      badge: "physical leads",
      bColor: "error" as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:gap-6">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${c.bg}`}>
            {c.icon}
          </div>
          <div className="flex items-end justify-between mt-5">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">{c.label}</span>
              <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                {loading ? <Skeleton /> : c.value.toLocaleString()}
              </h4>
            </div>
            <Badge color={c.bColor}>{loading ? "—" : c.badge}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
};
