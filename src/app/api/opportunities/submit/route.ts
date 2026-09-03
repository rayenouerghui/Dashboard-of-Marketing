import { NextRequest, NextResponse } from "next/server";
import { appendOpportunitySubmission } from "@/lib/googleSheetsServer";
import { getUniversityById } from "@/lib/dataUtils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  // ── Required fields ────────────────────────────────────────────────────────
  const product        = String(body.product        ?? "").trim();
  const opportunityId  = String(body.opportunityId  ?? "").trim();
  const title          = String(body.title          ?? "").trim();
  const universityId   = String(body.universityId   ?? "").trim();
  const country        = String(body.country        ?? "").trim();

  if (!product)       return NextResponse.json({ success: false, error: "product is required."       }, { status: 400 });
  if (!title)         return NextResponse.json({ success: false, error: "title is required."         }, { status: 400 });
  if (!universityId)  return NextResponse.json({ success: false, error: "universityId is required."  }, { status: 400 });

  // ── Resolve university name from ID ────────────────────────────────────────
  const university = getUniversityById(universityId);
  const universityName = university?.name ?? universityId;

  // ── Optional fields ────────────────────────────────────────────────────────
  const duration        = String(body.duration        ?? "").trim();
  const opportunityDate = String(body.opportunityDate ?? "").trim();
  const epName          = String(body.epName          ?? "").trim();
  const condition       = String(body.condition       ?? "").trim();
  const note            = String(body.note            ?? "").trim();
  const source          = String(body.source          ?? "Admin Dashboard").trim();

  try {
    const result = await appendOpportunitySubmission({
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

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to write to Google Sheets.";
    console.error("[api/opportunities/submit] error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: false, error: "Method not allowed." }, { status: 405 });
}
