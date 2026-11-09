import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { fetchAllExpaLeads, getCachedExpaLeads } from "@/lib/server/expaLeadsClient";
import { computeExpaLeadStats, type ExpaLeadStats } from "@/lib/server/expaLeadStats";
import { computeExpaAttractionStats, type AttractionLeadStats } from "@/lib/server/expaAttractionStats";
import { getApplicationsFromSheets, type ApplicationsFromSheets } from "@/lib/server/expaApplicationsFromSheets";

export const dynamic = "force-dynamic";

// Single payload that fills the whole admin dashboard (Welcome Admin + every
// sub-page such as Conversion Rate). Built from ONE EXPA leads pull plus the
// shared applications cache, so the client only ever issues one request.
export interface AdminDashboardPayload {
  success:     true;
  fetchedAt:   string;
  expaStatus:  "ok" | "empty";
  attraction:  AttractionLeadStats;
  leads:       ExpaLeadStats;
  applications: ApplicationsFromSheets;
}

export async function GET(request: Request) {
  const nocache = new URL(request.url).searchParams.get("nocache") === "1";

  try {
    await requireRole("admin"); // Admin only - contains EP personal data

    // One EXPA pull feeds both the attraction stats and the conversion funnel.
    const { leads } = nocache ? await fetchAllExpaLeads() : await getCachedExpaLeads();
    const attraction = computeExpaAttractionStats(leads);
    const leadsStats = computeExpaLeadStats(leads);

    // The applications set has its own failure domain (sheet reads + per-person
    // EXPA lookups). Keep a failure there from blanking the lead/attraction cards:
    // flag it degraded so the UI can warn instead of showing zeros.
    let applications: ApplicationsFromSheets;
    try {
      applications = await getApplicationsFromSheets(nocache);
    } catch (err) {
      console.error("[api/admin-dashboard] applications load failed:", err);
      applications = {
        applications: [], skipped: 0, notFound: [], failedBatches: 0, brokenApprovals: 0,
        degraded: true, totalLeads: 0, fetchedAt: new Date().toISOString(),
      };
    }

    const payload: AdminDashboardPayload = {
      success: true,
      fetchedAt: new Date().toISOString(),
      expaStatus: attraction.byProgramme.length > 0 ? "ok" : "empty",
      attraction,
      leads: leadsStats,
      applications,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }

    console.error("[api/admin-dashboard] error:", error);
    return NextResponse.json(
      { success: false, error: "EXPA data unavailable (token expired or service down)" },
      { status: 500 }
    );
  }
}
