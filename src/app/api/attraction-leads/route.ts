import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { fetchAllExpaLeads, getCachedExpaLeads } from "@/lib/server/expaLeadsClient";
import { computeExpaAttractionStats } from "@/lib/server/expaAttractionStats";

export const dynamic = "force-dynamic";

export type { AttractionLeadStats } from "@/lib/server/expaAttractionStats";

export async function GET(request: Request) {
  const nocache = new URL(request.url).searchParams.get("nocache") === "1";

  try {
    await requireRole("admin");

    // Shared EXPA pull with the leads / universities routes; ?nocache=1 bypasses
    // the cache for an on-demand refresh.
    const { leads } = nocache ? await fetchAllExpaLeads() : await getCachedExpaLeads();
    const stats = computeExpaAttractionStats(leads);

    return NextResponse.json(
      {
        success: true,
        stats,
        totalRows: leads.length,
        source: "expa" as const,
        fetchedAt: new Date().toISOString(),
        expaStatus: stats.byProgramme.length > 0 ? "ok" : "empty",
        leadsFetched: leads.length,
      },
      { status: 200 }
    );
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
