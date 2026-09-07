import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchAllExpaLeads, fetchRecentExpaLeads, type ExpaLead } from "@/lib/server/expaLeadsClient";

export const dynamic = "force-dynamic";

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

export interface ExpaLeadStats {
  totalLeads:     number;
  leadsToday:     number;
  leadsThisWeek:  number;
  leadsThisMonth: number;
  // Conversion funnel counts
  applied:        number;  // has any application (non-withdrawn/rejected)
  approved:       number;  // approved / approved_ep_manager / accepted
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

const APPLIED_S  = new Set(["open","accepted","approved","approved_ep_manager","matched","realized","completed","finished"]);
const APPROVED_S = new Set(["approved","approved_ep_manager","accepted","matched","realized","completed","finished"]);
const REALIZED_S = new Set(["realized","completed","finished"]);

function computeStats(leads: ExpaLead[]): ExpaLeadStats {
  const { today, weekStartDay, monthStart } = getDateBounds();

  let leadsToday = 0, leadsThisWeek = 0, leadsThisMonth = 0;
  let applied = 0, approved = 0, realized = 0;

  const byProgramme: Record<string, { total: number; applied: number; approved: number; realized: number }> = {};
  const byMonthMap = new Map<string, { label: string; count: number }>();

  for (const lead of leads) {
    const parts = parseDateParts(lead.createdAt);
    if (!parts) continue;

    // Date buckets
    if (parts.day === today)               leadsToday++;
    if (parts.day >= weekStartDay)         leadsThisWeek++;
    if (parts.day >= monthStart)           leadsThisMonth++;

    // Month series
    if (!byMonthMap.has(parts.monthKey)) {
      byMonthMap.set(parts.monthKey, { label: parts.monthLabel, count: 0 });
    }
    byMonthMap.get(parts.monthKey)!.count++;

    // Conversion funnel
    const s = lead.bestStatus;
    const isApplied  = s != null && APPLIED_S.has(s);
    const isApproved = s != null && APPROVED_S.has(s);
    const isRealized = s != null && REALIZED_S.has(s);

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

  const total = leads.length;

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
    recent: leads
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20),
    computedAt: new Date().toISOString(),
  };
}

// ─── Cached fetcher for recent leads (2 min - fast for dashboard) ─────────────
const getCachedRecentLeads = unstable_cache(
  async () => {
    const { leads, totalItems } = await fetchRecentExpaLeads();
    const stats = computeStats(leads);
    return { stats, totalItems };
  },
  ["expa-leads-recent"],
  { revalidate: 120 }
);

// ─── Cached fetcher for all leads (30 min - for conversion rate) ───────────────
const getCachedAllLeads = unstable_cache(
  async () => {
    const { leads, totalItems } = await fetchAllExpaLeads();
    const stats = computeStats(leads);
    return { stats, totalItems };
  },
  ["expa-leads-all"],
  { revalidate: 1800 }
);

// ─── Route ────────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const nocache = new URL(request.url).searchParams.get("nocache") === "1";
  const full = new URL(request.url).searchParams.get("full") === "1";

  try {
    // Use full fetch for conversion rate (slower, cached longer)
    // Use recent fetch for dashboard (faster, cached shorter)
    if (full) {
      const result = nocache
        ? await (async () => {
            const { leads, totalItems } = await fetchAllExpaLeads();
            return { stats: computeStats(leads), totalItems };
          })()
        : await getCachedAllLeads();
      return NextResponse.json({ success: true, ...result, mode: "full" }, { status: 200 });
    } else {
      const result = nocache
        ? await (async () => {
            const { leads, totalItems } = await fetchRecentExpaLeads();
            return { stats: computeStats(leads), totalItems };
          })()
        : await getCachedRecentLeads();
      return NextResponse.json({ success: true, ...result, mode: "recent" }, { status: 200 });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to fetch EXPA leads.";
    console.error("[api/expa/leads] error:", error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
