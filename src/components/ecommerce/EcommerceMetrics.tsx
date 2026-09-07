"use client";
import React from "react";
import Badge from "../ui/badge/Badge";
import { ArrowUpIcon, BoxIconLine, GroupIcon, UserCircleIcon, CheckCircleIcon } from "@/icons";
import type { ExpaLeadStats } from "@/app/api/expa/leads/route";

interface Props { stats: ExpaLeadStats; loading?: boolean; }

function Skeleton() {
  return <div className="h-8 w-20 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />;
}

export const EcommerceMetrics = ({ stats, loading }: Props) => {
  const { byProgramme } = stats;
  const gta = byProgramme["GTa"]?.total ?? 0;
  const gte = byProgramme["GTe"]?.total ?? 0;
  const gv  = byProgramme["GV"]?.total  ?? 0;

  const gtaRate = gta > 0 ? ((byProgramme["GTa"]?.applied ?? 0) / gta) * 100 : 0;
  const gteRate = gte > 0 ? ((byProgramme["GTe"]?.applied ?? 0) / gte) * 100 : 0;
  const gvRate = gv > 0 ? ((byProgramme["GV"]?.applied ?? 0) / gv) * 100 : 0;

  const cards = [
    {
      icon:  <GroupIcon className="text-blue-600 size-6 dark:text-blue-400" />,
      bg:    "bg-blue-100 dark:bg-blue-900/20",
      label: "Total Sign-Ups",
      value: stats.totalLeads,
      badge: `${stats.leadsToday} today`,
      bColor: "success" as const,
    },
    {
      icon:  <CheckCircleIcon className="text-cyan-600 size-6 dark:text-cyan-400" />,
      bg:    "bg-cyan-100 dark:bg-cyan-900/20",
      label: "GTa",
      value: gta,
      badge: `${gtaRate.toFixed(1)}% applied`,
      bColor: "primary" as const,
    },
    {
      icon:  <UserCircleIcon className="text-orange-600 size-6 dark:text-orange-400" />,
      bg:    "bg-orange-100 dark:bg-orange-900/20",
      label: "GTe",
      value: gte,
      badge: `${gteRate.toFixed(1)}% applied`,
      bColor: "warning" as const,
    },
    {
      icon:  <BoxIconLine className="text-rose-600 size-6 dark:text-rose-400" />,
      bg:    "bg-rose-100 dark:bg-rose-900/20",
      label: "GV",
      value: gv,
      badge: `${gvRate.toFixed(1)}% applied`,
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
