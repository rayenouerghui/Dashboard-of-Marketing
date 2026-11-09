import { format, startOfMonth, startOfWeek } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { formatDateInTunis, parseSubmittedAt } from "@/lib/dates";
import type { ExpaLead } from "@/lib/server/expaLeadsClient";

export interface AttractionLeadStats {
  totalLeads: number;
  leadsToday: number;
  leadsThisWeek: number;
  leadsThisMonth: number;
  byProgramme: Array<{ programme: string; total: number }>;
  byMonth: Array<{ label: string; key: string; count: number }>;
  recent: Array<{ id: string; fullName: string; email: string; programme: string; submittedAt: string }>;
  computedAt: string;
}

// The dashboard reports from the Feb 2026 campaign onwards.
const CAMPAIGN_START_MONTH = "2026-02";

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
  const byProgrammeMap = new Map<string, number>();
  const byMonthMap = new Map<string, { label: string; count: number }>();
  const recent: Array<{ id: string; fullName: string; email: string; programme: string; submittedAt: string }> = [];
  let totalLeads = 0;

  for (const lead of leads) {
    // The lead query now returns every status so the conversion funnel can see
    // the drop-offs; attraction figures stay on real applications only.
    if (!lead.bestStatus) continue;

    const createdAt = (lead.createdAt ?? "").trim();
    const date = parseSubmittedAt(createdAt);
    if (!date) continue;
    totalLeads++;

    const dayKey = formatDateInTunis(date, "yyyy-MM-dd");
    const monthKey = formatDateInTunis(date, "yyyy-MM");
    if (!byMonthMap.has(monthKey)) {
      byMonthMap.set(monthKey, { label: monthLabelFor(date), count: 0 });
    }
    byMonthMap.get(monthKey)!.count++;

    if (dayKey === today) leadsToday++;
    if (dayKey >= weekStart) leadsThisWeek++;
    if (dayKey >= monthStart) leadsThisMonth++;

    // home_lc is pinned to our own LC by the query, so every lead reports the
    // same value — the programme is the meaningful split EXPA gives us here.
    if (monthKey >= CAMPAIGN_START_MONTH) {
      const programme = (lead.programme ?? "").trim() || "Other";
      byProgrammeMap.set(programme, (byProgrammeMap.get(programme) ?? 0) + 1);
    }

    recent.push({
      id: lead.id,
      fullName: (lead.fullName ?? "").trim() || "—",
      email: (lead.email ?? "").trim(),
      programme: (lead.programme ?? "").trim() || "—",
      submittedAt: createdAt,
    });
  }

  const byProgramme = Array.from(byProgrammeMap.entries())
    .map(([programme, total]) => ({ programme, total }))
    .sort((a, b) => b.total - a.total);

  const byMonth = Array.from(byMonthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { label, count }]) => ({ key, label, count }));

  recent.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  return {
    totalLeads,
    leadsToday,
    leadsThisWeek,
    leadsThisMonth,
    byProgramme,
    byMonth,
    recent: recent.slice(0, 20),
    computedAt: now.toISOString(),
  };
}
