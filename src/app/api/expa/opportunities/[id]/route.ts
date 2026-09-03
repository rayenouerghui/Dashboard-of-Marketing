import { NextRequest, NextResponse } from "next/server";
import { ExpaClientError, fetchExpaOpportunityRaw } from "@/lib/server/expaClient";
import { mapExpaOpportunityToOpportunity } from "@/lib/server/expaOpportunityMapper";

export const dynamic = "force-dynamic";

function isValidOpportunityId(id: string) {
  return /^\d+$/.test(id.trim());
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!isValidOpportunityId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid Opportunity ID." },
        { status: 400 }
      );
    }

    const rawOpportunity = await fetchExpaOpportunityRaw(id);
    const opportunity = mapExpaOpportunityToOpportunity(rawOpportunity);

    return NextResponse.json({ success: true, opportunity }, { status: 200 });
  } catch (error) {
    if (error instanceof ExpaClientError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.status }
      );
    }

    console.error("[api/expa/opportunities/[id]] error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to fetch EXPA opportunity." },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json({ success: false, error: "Method not allowed" }, { status: 405 });
}