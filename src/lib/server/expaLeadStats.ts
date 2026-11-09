import type { ExpaLead } from "@/lib/server/expaLeadsClient";
import { FUNNEL_PRIORITY, CAMPAIGN_START_DAY } from "@/lib/server/expaShared";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExpaLeadStats {
  totalLeads:     number;  // people who signed up (form submissions), the funnel denominator
  leadsToday:     number;
  leadsThisWeek:  number;
  leadsThisMonth: number;
  // Conversion funnel counts (all "one entry per EP")
  applied:        number;  // has any application — approval_broken counts as applied
  approved:       number;  // approved / approved_ep_manager / approved_tn_manager / accepted
  realized:       number;  // realized / completed / finished
  // Rates (percentages)
  signupToApplied:    number; // applied / totalLeads * 100
  appliedToApproved:  number; // approved / applied * 100
  approvedToRealized: number; // realized / approved * 100
  // By programme
  byProgramme: Record<string, { total: number; applied: number; approved: number; realized: number }>;
  // By month (for charts) — ordered chronologically
  byMonth: Array<{ label: string; key: string; count: number }>;
  // Recent signups (last 20)
  recent: Array<{ id: string; fullName: string; email: string; createdAt: string; lcName: string; bestStatus: string | null; programme: string | null }>;
  computedAt: string;
}

// Funnel buckets. `approval_broken` counts as "applied" (the EP did apply), while
// withdrawn / rejected people stay in the sign-up denominator but never advance.
const APPLIED_S  = new Set(["open","accepted","approved","approved_ep_manager","approved_tn_manager","matched","realized","completed","finished","approval_broken"]);
const APPROVED_S = new Set(["approved","approved_ep_manager","approved_tn_manager","accepted","matched","realized","completed","finished"]);
const REALIZED_S = new Set(["realized","completed","finished"]);

function statusOf(lead: ExpaLead): string {
  return (lead.status ?? lead.bestStatus ?? "").trim();
}

// ─── Date helpers (no Date objects until we actually need them) ───────────────
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

function parseDateParts(iso: string): { y: number; m: number; d: number; day: string; monthKey: string; monthLabel: string } | null {
  const match = iso.match(DATE_RE);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return {
    y, m, d,
    day:        `${match[1]}-${match[2]}-${match[3]}`,
    monthKey:   `${match[1]}-${match[2]}`,
    monthLabel: `${MONTHS[m - 1]} ${String(y).slice(2)}`,
  };
}

function getDateBounds() {
  const now   = new Date();
  const y     = now.getFullYear();
  const mo    = now.getMonth() + 1;
  const d     = now.getDate();
  const today = `${y}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  // Start of ISO week (Monday)
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - dow);
  const ws = weekStart;
  const weekStartDay = `${ws.getFullYear()}-${String(ws.getMonth()+1).padStart(2,"0")}-${String(ws.getDate()).padStart(2,"0")}`;

  const monthStart = `${y}-${String(mo).padStart(2,"0")}-01`;

  return { today, weekStartDay, monthStart };
}

// ─── Stats computation ────────────────────────────────────────────────────────

// `signupTotal` is the number of people who actually signed up (form submissions
// from the sheets). EXPA only contains people who already applied, so using the
// EXPA population as the Sign-Up denominator inflates the rate (it puts the
// applied people in their own base). Pass the real sign-up count here; when it is
// missing (e.g. the sheets failed) we fall back to the EXPA population so the
// page still renders instead of showing a bogus 0.
export function computeExpaLeadStats(leads: ExpaLead[], signupTotal?: number): ExpaLeadStats {
  const { today, weekStartDay, monthStart } = getDateBounds();

  // One entry per EP: the raw lead query returns one row per application, so we
  // keep the most advanced status each person reached (needs EXPA person ids).
  const bestByPerson = new Map<string, ExpaLead>();
  for (const lead of leads) {
    const parts = parseDateParts(lead.createdAt);
    if (!parts) continue;
    if (parts.day < CAMPAIGN_START_DAY) continue; // campaign starts 1 Feb 2026

    const key = lead.personId || lead.email || lead.id;
    if (!key) continue;

    const current = bestByPerson.get(key);
    if (!current) { bestByPerson.set(key, lead); continue; }
    const pri = FUNNEL_PRIORITY[statusOf(lead)] ?? 0;
    const cur = FUNNEL_PRIORITY[statusOf(current)] ?? 0;
    if (pri > cur) bestByPerson.set(key, lead);
  }

  let leadsToday = 0, leadsThisWeek = 0, leadsThisMonth = 0;
  let applied = 0, approved = 0, realized = 0;

  const byProgramme: Record<string, { total: number; applied: number; approved: number; realized: number }> = {};
  const byMonthMap = new Map<string, { label: string; count: number }>();

  for (const lead of bestByPerson.values()) {
    const parts = parseDateParts(lead.createdAt)!; // guaranteed by the filter above

    // Date buckets
    if (parts.day === today)       leadsToday++;
    if (parts.day >= weekStartDay) leadsThisWeek++;
    if (parts.day >= monthStart)   leadsThisMonth++;

    // Month series
    if (!byMonthMap.has(parts.monthKey)) {
      byMonthMap.set(parts.monthKey, { label: parts.monthLabel, count: 0 });
    }
    byMonthMap.get(parts.monthKey)!.count++;

    // Conversion funnel
    const s = statusOf(lead);
    const isApplied  = APPLIED_S.has(s);
    const isApproved = APPROVED_S.has(s);
    const isRealized = REALIZED_S.has(s);

    if (isApplied)  applied++;
    if (isApproved) approved++;
    if (isRealized) realized++;

    // By programme
    const prog = lead.programme ?? "Other";
    if (!byProgramme[prog]) byProgramme[prog] = { total: 0, applied: 0, approved: 0, realized: 0 };
    byProgramme[prog].total++;
    if (isApplied)  byProgramme[prog].applied++;
    if (isApproved) byProgramme[prog].approved++;
    if (isRealized) byProgramme[prog].realized++;
  }

  // Sort months chronologically
  const byMonth = Array.from(byMonthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { label, count }]) => ({ key, label, count }));

  // Sign-Up denominator = real form sign-ups when available, else the EXPA
  // population (fallback only — see note above).
  const total = signupTotal && signupTotal > 0 ? signupTotal : bestByPerson.size;

  return {
    totalLeads:     total,
    leadsToday,
    leadsThisWeek,
    leadsThisMonth,
    applied,
    approved,
    realized,
    signupToApplied:    total    > 0 ? (applied  / total)    * 100 : 0,
    appliedToApproved:  applied  > 0 ? (approved / applied)  * 100 : 0,
    approvedToRealized: approved > 0 ? (realized / approved) * 100 : 0,
    byProgramme,
    byMonth,
    recent: Array.from(bestByPerson.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20),
    computedAt: new Date().toISOString(),
  };
}
