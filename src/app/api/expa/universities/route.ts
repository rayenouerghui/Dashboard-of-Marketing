import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchAllExpaLeads, type ExpaLead } from "@/lib/server/expaLeadsClient";

export const dynamic = "force-dynamic";

export interface UniversityStats {
  name: string;
  totalEPs: number;
  applied: number;
  approved: number;
  realized: number;
  approvalRate: number;
  realizationRate: number;
}

const APPLIED_S = new Set(["open", "accepted", "approved", "approved_ep_manager", "matched", "realized", "completed", "finished"]);
const APPROVED_S = new Set(["approved", "approved_ep_manager", "accepted", "matched", "realized", "completed", "finished"]);
const REALIZED_S = new Set(["realized", "completed", "finished"]);

function computeUniversityStats(leads: ExpaLead[]): UniversityStats[] {
  const map = new Map<string, { total: number; applied: number; approved: number; realized: number }>();

  for (const lead of leads) {
    // Use LC name as university since EXPA doesn't have university field for leads
    const name = lead.lcName || "Unknown";
    const entry = map.get(name) ?? { total: 0, applied: 0, approved: 0, realized: 0 };
    entry.total++;
    
    const s = lead.bestStatus;
    if (s != null && APPLIED_S.has(s)) entry.applied++;
    if (s != null && APPROVED_S.has(s)) entry.approved++;
    if (s != null && REALIZED_S.has(s)) entry.realized++;
    
    map.set(name, entry);
  }

  return [...map.entries()]
    .map(([name, { total, applied, approved, realized }]) => ({
      name,
      totalEPs: total,
      applied,
      approved,
      realized,
      approvalRate: total > 0 ? (approved / total) * 100 : 0,
      realizationRate: total > 0 ? (realized / total) * 100 : 0,
    }))
    .sort((a, b) => b.totalEPs - a.totalEPs);
}

const getCachedUniversityStats = unstable_cache(
  async () => {
    const { leads } = await fetchAllExpaLeads();
    const stats = computeUniversityStats(leads);
    return stats;
  },
  ["expa-university-stats"],
  { revalidate: 900 }
);

export async function GET(request: Request) {
  const nocache = new URL(request.url).searchParams.get("nocache") === "1";

  try {
    const stats = nocache
      ? computeUniversityStats((await fetchAllExpaLeads()).leads)
      : await getCachedUniversityStats();

    return NextResponse.json({ success: true, stats }, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to fetch EXPA university stats.";
    console.error("[api/expa/universities] error:", error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
