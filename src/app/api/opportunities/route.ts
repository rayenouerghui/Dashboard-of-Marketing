import { NextRequest, NextResponse } from "next/server";
import { loadOpportunitiesFromSheet, deleteOpportunityFromSheet } from "@/lib/googleSheetsServer";
import { getOpportunities } from "@/lib/dataUtils";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const universityId = searchParams.get("universityId") ?? undefined;

  try {
    const sheetOpps = await loadOpportunitiesFromSheet(universityId);

    // If the sheet has data, return it — otherwise fall back to static JSON seed
    if (sheetOpps.length > 0) {
      return NextResponse.json({ success: true, opportunities: sheetOpps }, { status: 200 });
    }

    // Fallback: static opportunities.json (seed data, filtered by universityId if provided)
    const staticOpps = getOpportunities().filter(
      (o) => !universityId || o.universityId === universityId
    );
    return NextResponse.json({ success: true, opportunities: staticOpps }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load opportunities.";
    console.error("[api/opportunities] GET error:", error);

    // On any sheet error fall back to static data so the member page never breaks
    try {
      const staticOpps = getOpportunities().filter(
        (o) => !universityId || o.universityId === universityId
      );
      return NextResponse.json(
        { success: true, opportunities: staticOpps, warning: message },
        { status: 200 }
      );
    } catch {
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const opportunityId = searchParams.get("id");

  if (!opportunityId) {
    return NextResponse.json(
      { success: false, error: "Opportunity ID (id) is required." },
      { status: 400 }
    );
  }

  try {
    await deleteOpportunityFromSheet(opportunityId);
    revalidateTag("google-sheets-data", "api/opportunities");
    revalidateTag("scheduled-attractions", "api/opportunities");
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete opportunity.";
    console.error("[api/opportunities] DELETE error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
