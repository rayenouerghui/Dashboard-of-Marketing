import { NextRequest, NextResponse } from "next/server";
import { appendOpportunitySubmission } from "@/lib/googleSheetsServer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const product = String(body?.product ?? "").trim();
    const opportunityId = String(body?.opportunityId ?? "").trim();
    const opportunityTitle = String(body?.opportunityTitle ?? "").trim();
    const universityId = String(body?.universityId ?? "").trim();
    const universityName = String(body?.universityName ?? "").trim();
    const country = String(body?.country ?? "").trim();
    const duration = String(body?.duration ?? "").trim();
    const opportunityDate = String(body?.opportunityDate ?? "").trim();
    const epName = String(body?.epName ?? "").trim();
    const condition = String(body?.condition ?? body?.note ?? "").trim();
    const note = String(body?.note ?? "").trim();
    const source = String(body?.source ?? "member-dashboard").trim();

    if (!product || !opportunityId || !opportunityTitle || !universityId || !universityName || !epName) {
      return NextResponse.json(
        { error: "Missing required opportunity submission fields." },
        { status: 400 }
      );
    }

    const result = await appendOpportunitySubmission({
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

    return NextResponse.json({ success: true, ...result }, { status: 200 });
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