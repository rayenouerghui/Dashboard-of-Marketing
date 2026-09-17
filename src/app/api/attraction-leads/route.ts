import { NextResponse } from "next/server";
import { fetchPhysicalLeadsRaw } from "@/lib/googleSheetsServer";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AttractionLeadStats {
  totalLeads: number;
  leadsToday: number;
  leadsThisWeek: number;
  leadsThisMonth: number;
  // By university
  byUniversity: Record<string, { total: number; today: number; thisWeek: number; thisMonth: number }>;
  // By month (for charts)
  byMonth: Array<{ label: string; key: string; count: number }>;
  // Recent signups (last 20)
  recent: Array<{ id: string; fullName: string; email: string; university: string; submittedAt: string }>;
  computedAt: string;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function todayLocalStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDateBounds() {
  const now = new Date();
  const y = now.getFullYear();
  const mo = now.getMonth() + 1;
  const d = now.getDate();
  const today = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  // Start of ISO week (Monday)
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - dow);
  const ws = weekStart;
  const weekStartDay = `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, "0")}-${String(ws.getDate()).padStart(2, "0")}`;

  const monthStart = `${y}-${String(mo).padStart(2, "0")}-01`;

  return { today, weekStartDay, monthStart };
}

function parseDateParts(iso: string): { y: number; m: number; d: number; day: string; monthKey: string; monthLabel: string } | null {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return {
    y, m, d,
    day: `${match[1]}-${match[2]}-${match[3]}`,
    monthKey: `${match[1]}-${match[2]}`,
    monthLabel: `${MONTHS[m - 1]} ${String(y).slice(2)}`,
  };
}

// ─── Stats computation ───────────────────────────────────────────────────────────
function computeStats(rows: Record<string, string>[]): AttractionLeadStats {
  const { today, weekStartDay, monthStart } = getDateBounds();

  let leadsToday = 0, leadsThisWeek = 0, leadsThisMonth = 0;
  const byUniversity: Record<string, { total: number; today: number; thisWeek: number; thisMonth: number }> = {};
  const byMonthMap = new Map<string, { label: string; count: number }>();
  const recent: Array<{ id: string; fullName: string; email: string; university: string; submittedAt: string }> = [];

  for (const row of rows) {
    const submittedAt = row["Submitted at"] || row.submittedAt || row.submitted_at || "";
    const university = (row["University"] || row.university || row.University || "").trim();
    const fullName = (row["Full Name"] || row.fullName || row["Full Name"] || "").trim();
    const email = (row["Email"] || row.email || row.Email || "").trim();

    if (!submittedAt) continue;

    const parts = parseDateParts(submittedAt);
    if (!parts) continue;

    // Date buckets
    if (parts.day === today) leadsToday++;
    if (parts.day >= weekStartDay) leadsThisWeek++;
    if (parts.day >= monthStart) leadsThisMonth++;

    // Month series
    if (!byMonthMap.has(parts.monthKey)) {
      byMonthMap.set(parts.monthKey, { label: parts.monthLabel, count: 0 });
    }
    byMonthMap.get(parts.monthKey)!.count++;

    // By university
    if (university) {
      if (!byUniversity[university]) {
        byUniversity[university] = { total: 0, today: 0, thisWeek: 0, thisMonth: 0 };
      }
      byUniversity[university].total++;
      if (parts.day === today) byUniversity[university].today++;
      if (parts.day >= weekStartDay) byUniversity[university].thisWeek++;
      if (parts.day >= monthStart) byUniversity[university].thisMonth++;
    }

    // Recent signups
    if (recent.length < 20) {
      recent.push({
        id: row.id || String(recent.length),
        fullName,
        email,
        university,
        submittedAt,
      });
    }
  }

  // Sort months chronologically
  const byMonth = Array.from(byMonthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { label, count }]) => ({ key, label, count }));

  // Sort recent by date (newest first)
  recent.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  return {
    totalLeads: rows.length,
    leadsToday,
    leadsThisWeek,
    leadsThisMonth,
    byUniversity,
    byMonth,
    recent,
    computedAt: new Date().toISOString(),
  };
}

// ─── Cached fetcher (2 min for real-time updates) ─────────────────────────────
const getCachedAttractionLeads = unstable_cache(
  async () => {
    const rows = await fetchPhysicalLeadsRaw();
    const stats = computeStats(rows);
    return { stats, totalRows: rows.length };
  },
  ["attraction-leads-stats"],
  { revalidate: 120 }
);

// ─── Route ────────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const nocache = new URL(request.url).searchParams.get("nocache") === "1";

  try {
    const result = nocache
      ? await (async () => {
          const rows = await fetchPhysicalLeadsRaw();
          return { stats: computeStats(rows), totalRows: rows.length };
        })()
      : await getCachedAttractionLeads();

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to fetch attraction leads.";
    console.error("[api/attraction-leads] error:", error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
