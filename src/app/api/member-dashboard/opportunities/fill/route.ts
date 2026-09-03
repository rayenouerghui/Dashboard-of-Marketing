import { NextRequest, NextResponse } from "next/server";
import { appendOpportunitySubmission } from "@/lib/googleSheetsServer";
import { addSubmission, productToSheet } from "@/lib/submissionsStore";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const product         = String(body?.product         ?? "").trim();
    const opportunityId   = String(body?.opportunityId   ?? "").trim();
    const opportunityTitle= String(body?.opportunityTitle?? "").trim();
    const universityId    = String(body?.universityId    ?? "").trim();
    const universityName  = String(body?.universityName  ?? "").trim();
    const country         = String(body?.country         ?? "").trim();
    const duration        = String(body?.duration        ?? "").trim();
    const opportunityDate = String(body?.opportunityDate ?? "").trim();
    const epName          = String(body?.epName          ?? "").trim();
    const condition       = String(body?.condition ?? body?.note ?? "").trim();
    const note            = String(body?.note            ?? "").trim();
    const source          = String(body?.source          ?? "member-dashboard").trim();

    if (!product || !opportunityId || !opportunityTitle || !universityId || !universityName || !epName) {
      return NextResponse.json(
        { error: "Missing required opportunity submission fields." },
        { status: 400 }
      );
    }

    // 1. Record in-memory so the submissions viewer can show it instantly
    addSubmission({
      sheet: productToSheet(product),
      product,
      opportunityId,
      opportunityTitle,
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

    // 2. Also write to Google Sheets (best-effort — don't fail the request if sheets is down)
    let sheetResult: Record<string, unknown> = {};
    try {
      sheetResult = await appendOpportunitySubmission({
        product,
        opportunityId,
        opportunityTitle,
        universityId,
        universityName,
        country,
        duration,
        opportunityDate,
        epName,
        condition,
        note,
        source,
        submittedAt: new Date().toISOString(),
      });
    } catch (sheetErr) {
      console.error("[fill] Google Sheets write failed (non-fatal):", sheetErr);
    }

    return NextResponse.json({ success: true, ...sheetResult }, { status: 200 });
  } catch (error) {
    console.error("[member-dashboard/opportunities/fill] error:", error);
    return NextResponse.json(
      { error: String((error as Error)?.message ?? error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
