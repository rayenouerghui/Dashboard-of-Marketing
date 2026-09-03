import { NextRequest, NextResponse } from "next/server";
import { appendOpportunitySubmission, saveOpportunityToSheet } from "@/lib/googleSheetsServer";
import { getUniversityById, type Opportunity } from "@/lib/dataUtils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  // ── Required fields ────────────────────────────────────────────────────────
  const product       = String(body.product       ?? "").trim();
  const opportunityId = String(body.opportunityId ?? "").trim();
  const title         = String(body.title         ?? "").trim();
  const universityId  = String(body.universityId  ?? "").trim();
  const country       = String(body.country       ?? "").trim();

  if (!product)      return NextResponse.json({ success: false, error: "product is required."      }, { status: 400 });
  if (!title)        return NextResponse.json({ success: false, error: "title is required."        }, { status: 400 });
  if (!universityId) return NextResponse.json({ success: false, error: "universityId is required." }, { status: 400 });

  const university = getUniversityById(universityId);
  const universityName = university?.name ?? universityId;

  // ── Optional fields ────────────────────────────────────────────────────────
  const duration        = String(body.duration        ?? "").trim();
  const opportunityDate = String(body.opportunityDate ?? "").trim();
  const epName          = String(body.epName          ?? "").trim();
  const condition       = String(body.condition       ?? "").trim();
  const note            = String(body.note            ?? "").trim();
  const source          = String(body.source          ?? "Admin Dashboard").trim();

  // Full opportunity object sent from the admin form (for cross-device persistence)
  const fullOpportunity = body.opportunity as Opportunity | undefined;

  const errors: string[] = [];

  // 1. Write summary row to the tracking sheet (OGV / OGT)
  let sheetResult: Awaited<ReturnType<typeof appendOpportunitySubmission>> | null = null;
  try {
    sheetResult = await appendOpportunitySubmission({
      product,
      opportunityId,
      opportunityTitle: title,
      universityId,
      universityName,
      country,
      duration,
      opportunityDate,
      epName,
      condition,
      note,
      source,
    });
  } catch (err) {
    errors.push(`Tracking sheet: ${err instanceof Error ? err.message : String(err)}`);
    console.error("[api/opportunities/submit] tracking sheet error:", err);
  }

  // 2. Persist full opportunity object to the Opportunities tab (for member reads)
  if (fullOpportunity) {
    try {
      await saveOpportunityToSheet(fullOpportunity);
    } catch (err) {
      errors.push(`Opportunity store: ${err instanceof Error ? err.message : String(err)}`);
      console.error("[api/opportunities/submit] opportunity store error:", err);
    }
  }

  if (errors.length > 0 && !sheetResult) {
    // Both writes failed
    return NextResponse.json(
      { success: false, error: errors.join(" | ") },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      ...(sheetResult ?? {}),
      warnings: errors.length > 0 ? errors : undefined,
    },
    { status: 200 }
  );
}

export async function GET() {
  return NextResponse.json({ success: false, error: "Method not allowed." }, { status: 405 });
}
