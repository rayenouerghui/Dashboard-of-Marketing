import { NextResponse } from "next/server";
import { fetchPhysicalLeadsRaw } from "@/lib/googleSheetsServer";
import { fetchApplicationsForLeads } from "@/lib/server/expaApplicationsClient";
import { unstable_cache } from "next/cache";
import type { LeadInput } from "@/lib/server/expaApplicationsClient";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface MemberStat {
  name:            string;
  totalLeads:      number;
  todayLeads:      number;
  applied:         number;
  realized:        number;
  applicationRate: number;
  realizationRate: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayLocalStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateStr(iso: string): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

const APPLIED_STATUSES  = new Set(["open","accepted","approved","approved_ep_manager","matched","realized","completed","finished"]);
const REALIZED_STATUSES = new Set(["realized","completed","finished"]);

// ─── Cache EXPA lookup for 15 min — it's the slow part ───────────────────────
const getCachedExpaStatuses = unstable_cache(
  async (expaIds: string[]): Promise<Record<string, string>> => {
    if (expaIds.length === 0) return {};
    const leadInputs: LeadInput[] = expaIds.map((id) => ({
      expaId: id, firstName: "", lastName: "", email: "", university: "",
      source: "physical" as const,
    }));
    const { applications } = await fetchApplicationsForLeads(leadInputs);
    const map: Record<string, string> = {};
    for (const a of applications) map[a.epId] = a.status;
    return map;
  },
  ["ranking-expa-statuses"],
  { revalidate: 900 } // 15 min
);

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // ?expa=0 skips EXPA lookup entirely — returns sheet data immediately
    const skipExpa = searchParams.get("expa") === "0";

    const today   = todayLocalStr();
    const rawRows = await fetchPhysicalLeadsRaw();

    const memberLeads = new Map<string, { total: number; today: number; expaIds: Set<string> }>();

    for (const r of rawRows) {
      const memberName = (r["🙋Member Name"] || r.memberName || r.member_name || "").trim();
      if (!memberName) continue;

      const submittedAt = r["Submitted at"] || r.submittedAt || r.submitted_at || "";
      const expaId      = (r["EXPA ID"] || r.expaId || r.eXPAID || "").trim();
      const isToday     = dateStr(submittedAt) === today;

      if (!memberLeads.has(memberName)) {
        memberLeads.set(memberName, { total: 0, today: 0, expaIds: new Set() });
      }
      const entry = memberLeads.get(memberName)!;
      entry.total++;
      if (isToday) entry.today++;
      if (expaId && /^\d+$/.test(expaId)) entry.expaIds.add(expaId);
    }

    // EXPA lookup — use cache, skip if ?expa=0
    let expaStatusByEpId: Record<string, string> = {};
    if (!skipExpa) {
      try {
        const allExpaIds = new Set<string>();
        for (const data of memberLeads.values()) {
          for (const id of data.expaIds) allExpaIds.add(id);
        }
        if (allExpaIds.size > 0) {
          // Sort for stable cache key
          const sortedIds = Array.from(allExpaIds).sort();
          expaStatusByEpId = await getCachedExpaStatuses(sortedIds);
        }
      } catch (err) {
        console.warn("[api/ranking] EXPA lookup failed (non-fatal):", err);
      }
    }

    const stats: MemberStat[] = [];
    for (const [name, data] of memberLeads.entries()) {
      let applied = 0, realized = 0;
      for (const epId of data.expaIds) {
        const status = expaStatusByEpId[epId];
        if (!status) continue;
        if (APPLIED_STATUSES.has(status))  applied++;
        if (REALIZED_STATUSES.has(status)) realized++;
      }
      stats.push({
        name,
        totalLeads:      data.total,
        todayLeads:      data.today,
        applied,
        realized,
        applicationRate: data.total > 0 ? (applied  / data.total) * 100 : 0,
        realizationRate: data.total > 0 ? (realized / data.total) * 100 : 0,
      });
    }

    stats.sort((a, b) => b.totalLeads - a.totalLeads || a.name.localeCompare(b.name));

    return NextResponse.json({
      success:       true,
      members:       stats,
      totalMembers:  stats.length,
      totalLeads:    stats.reduce((s, m) => s + m.totalLeads,  0),
      todayLeads:    stats.reduce((s, m) => s + m.todayLeads,  0),
      totalApplied:  stats.reduce((s, m) => s + m.applied,     0),
      totalRealized: stats.reduce((s, m) => s + m.realized,    0),
      generatedAt:   new Date().toISOString(),
      cached:        !skipExpa,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to compute rankings.";
    console.error("[api/ranking] error:", error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
