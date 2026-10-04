import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { requireRole } from "@/lib/auth";
import { fetchAllExpaLeads } from "@/lib/server/expaLeadsClient";
import { computeExpaAttractionStats } from "@/lib/server/expaAttractionStats";

export const dynamic = "force-dynamic";

export type { AttractionLeadStats } from "@/lib/server/expaAttractionStats";

const getCachedAttractionLeads = unstable_cache(
  async () => {
    const { leads } = await fetchAllExpaLeads();
    const stats = computeExpaAttractionStats(leads);
    return {
      stats,
      totalRows: leads.length,
      source: "expa" as const,
      fetchedAt: new Date().toISOString(),
      expaStatus: Object.keys(stats.byUniversity).length > 0 ? "ok" : "empty",
      leadsFetched: leads.length,
    };
  },
  ["attraction-leads-stats"],
  { revalidate: 120 }
);

export async function GET(request: Request) {
  const nocache = new URL(request.url).searchParams.get("nocache") === "1";

  try {
    await requireRole("admin");

    const result = nocache
      ? await (async () => {
          const { leads } = await fetchAllExpaLeads();
          const stats = computeExpaAttractionStats(leads);
          return {
            stats,
            totalRows: leads.length,
            source: "expa" as const,
            fetchedAt: new Date().toISOString(),
            expaStatus: Object.keys(stats.byUniversity).length > 0 ? "ok" : "empty",
            leadsFetched: leads.length,
          };
        })()
      : await getCachedAttractionLeads();

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }

    console.error("[api/attraction-leads] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "EXPA data unavailable (token expired or service down)",
        source: "expa",
        expaStatus: "error",
        leadsFetched: 0,
      },
      { status: 500 }
    );
  }
}
