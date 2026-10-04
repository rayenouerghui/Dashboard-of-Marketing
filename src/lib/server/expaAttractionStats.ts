import { format, startOfMonth, startOfWeek } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { formatDateInTunis, parseSubmittedAt } from "@/lib/dates";
import type { ExpaLead } from "@/lib/server/expaLeadsClient";

export interface AttractionLeadStats {
  totalLeads: number;
  leadsToday: number;
  leadsThisWeek: number;
  leadsThisMonth: number;
  byUniversity: Record<string, { total: number; today: number; thisWeek: number; thisMonth: number }>;
  byMonth: Array<{ label: string; key: string; count: number }>;
  recent: Array<{ id: string; fullName: string; email: string; university: string; submittedAt: string }>;
  computedAt: string;
}

const INVALID_UNIVERSITY_NAMES = new Set([
  "information",
  "classroom",
  "all sources",
  "all source",
  "all",
  "unknown",
  "n/a",
  "na",
]);

function normalizeUniversityName(value: string | null | undefined): string | null {
  const name = (value ?? "").trim();
  if (!name) return null;
  const normalized = name.replace(/\s+/g, " ").trim();
  if (INVALID_UNIVERSITY_NAMES.has(normalized.toLowerCase())) return null;
  return normalized;
}

function monthLabelFor(date: Date): string {
  return formatDateInTunis(date, "MMM yy");
}

function getDateBoundsFor(now: Date) {
  const zonedNow = toZonedTime(now, "Africa/Tunis");
  return {
    today: format(zonedNow, "yyyy-MM-dd"),
    weekStart: format(startOfWeek(zonedNow, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    monthStart: format(startOfMonth(zonedNow), "yyyy-MM-dd"),
  };
}

export function computeExpaAttractionStats(leads: ExpaLead[], now: Date = new Date()): AttractionLeadStats {
  const { today, weekStart, monthStart } = getDateBoundsFor(now);
  let leadsToday = 0;
  let leadsThisWeek = 0;
  let leadsThisMonth = 0;
  const byUniversity: Record<string, { total: number; today: number; thisWeek: number; thisMonth: number }> = {};
  const byMonthMap = new Map<string, { label: string; count: number }>();
  const recent: Array<{ id: string; fullName: string; email: string; university: string; submittedAt: string }> = [];

  for (const lead of leads) {
    const createdAt = (lead.createdAt ?? "").trim();
    const date = parseSubmittedAt(createdAt);
    if (!date) continue;

    const dayKey = formatDateInTunis(date, "yyyy-MM-dd");
    const monthKey = formatDateInTunis(date, "yyyy-MM");
    if (!byMonthMap.has(monthKey)) {
      byMonthMap.set(monthKey, { label: monthLabelFor(date), count: 0 });
    }
    byMonthMap.get(monthKey)!.count++;

    if (dayKey === today) leadsToday++;
    if (dayKey >= weekStart) leadsThisWeek++;
    if (dayKey >= monthStart) leadsThisMonth++;

    const university = normalizeUniversityName(lead.lcName);
    if (university) {
      if (!byUniversity[university]) {
        byUniversity[university] = { total: 0, today: 0, thisWeek: 0, thisMonth: 0 };
      }
      byUniversity[university].total++;
      if (dayKey === today) byUniversity[university].today++;
      if (dayKey >= weekStart) byUniversity[university].thisWeek++;
      if (dayKey >= monthStart) byUniversity[university].thisMonth++;
    }

    recent.push({
      id: lead.id,
      fullName: (lead.fullName ?? "").trim() || "—",
      email: (lead.email ?? "").trim(),
      university: university ?? "—",
      submittedAt: createdAt,
    });
  }

  const byMonth = Array.from(byMonthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { label, count }]) => ({ key, label, count }));

  recent.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  return {
    totalLeads: leads.length,
    leadsToday,
    leadsThisWeek,
    leadsThisMonth,
    byUniversity,
    byMonth,
    recent: recent.slice(0, 20),
    computedAt: now.toISOString(),
  };
}
