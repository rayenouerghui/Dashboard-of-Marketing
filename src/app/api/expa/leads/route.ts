import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { fetchAllExpaLeads, getCachedExpaLeads } from "@/lib/server/expaLeadsClient";
import { computeExpaLeadStats } from "@/lib/server/expaLeadStats";

export const dynamic = "force-dynamic";

export type { ExpaLeadStats } from "@/lib/server/expaLeadStats";

// ─── Route ────────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const nocache = new URL(request.url).searchParams.get("nocache") === "1";

  try {
    await requireRole("admin"); // Admin only - contains EP personal data

    // Cached path shares one EXPA pull with the attraction-leads route;
    // ?nocache=1 bypasses the cache for an on-demand refresh.
    const { leads, totalItems } = nocache ? await fetchAllExpaLeads() : await getCachedExpaLeads();

    return NextResponse.json({ success: true, stats: computeExpaLeadStats(leads), totalItems }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }

    const msg = error instanceof Error ? error.message : "Failed to fetch EXPA leads.";
    console.error("[api/expa/leads] error:", error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
