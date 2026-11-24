import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getCachedExpaLeads } from "@/lib/server/expaLeadsClient";
import { computeExpaLeadStats, type ExpaLeadStats } from "@/lib/server/expaLeadStats";
import { computeExpaAttractionStats, type AttractionLeadStats } from "@/lib/server/expaAttractionStats";
import { getApplicationsFromSheets, type ApplicationsFromSheets } from "@/lib/server/expaApplicationsFromSheets";
import { getLastSuccessfulExpaRefresh, performExpaRefresh } from "@/lib/server/expaRefresh";

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
  lastExpaRefreshAt: string | null;
}

export async function GET(request: Request) {
  const nocache = new URL(request.url).searchParams.get("nocache") === "1";

  try {
    await requireRole("admin"); // Admin only - contains EP personal data

    // One EXPA pull feeds both the attraction stats and the conversion funnel.
    // Manual refresh performs a complete EXPA synchronization. Normal reads
    // continue to use the shared cached payload.
    const refreshResult = nocache ? await performExpaRefresh() : null;
    const { leads } = refreshResult
      ? { leads: refreshResult.leads }
      : await getCachedExpaLeads();
    const attraction = computeExpaAttractionStats(leads);

    // The applications set has its own failure domain (sheet reads + per-person
    // EXPA lookups). Keep a failure there from blanking the lead/attraction cards:
    // flag it degraded so the UI can warn instead of showing zeros.
    let applications: ApplicationsFromSheets;
    try {
      applications = refreshResult?.applications ?? await getApplicationsFromSheets(nocache);
    } catch (err) {
      console.error("[api/admin-dashboard] applications load failed:", err);
      applications = {
        applications: [], skipped: 0, notFound: [], failedBatches: 0, brokenApprovals: 0,
        degraded: true, totalLeads: 0, fetchedAt: new Date().toISOString(),
      };
    }

    // Sign-Up denominator comes from the real form sign-ups (sheet `totalLeads`),
    // not the EXPA applicant population. Falls back internally when it is 0.
    const leadsStats = computeExpaLeadStats(leads, applications.totalLeads);

    const lastExpaRefreshAt = refreshResult?.refreshedAt ?? await getLastSuccessfulExpaRefresh();

    const payload: AdminDashboardPayload = {
      success: true,
      fetchedAt: new Date().toISOString(),
      expaStatus: attraction.byProgramme.length > 0 ? "ok" : "empty",
      attraction,
      leads: leadsStats,
      applications,
      lastExpaRefreshAt,
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
