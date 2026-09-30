import { NextRequest, NextResponse } from "next/server";
import { appendOpportunitySubmission, saveOpportunityToSheet } from "@/lib/googleSheetsServer";
import { getUniversityById, type Opportunity } from "@/lib/dataUtils";
import { z } from "zod";
import { sanitizeObject } from "@/lib/sanitize";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const submitSchema = z.object({
  product: z.string().min(1).max(50),
  opportunityId: z.string().max(50).optional(),
  title: z.string().min(1).max(200),
  universityId: z.string().min(1).max(50),
  country: z.string().max(100).optional(),
  duration: z.string().max(50).optional(),
  opportunityDate: z.string().max(50).optional(),
  epName: z.string().max(100).optional(),
  condition: z.string().max(500).optional(),
  note: z.string().max(500).optional(),
  source: z.string().max(50).optional(),
  opportunity: z.any().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireRole('admin'); // Admin only
    const body = await request.json();
    
    // Validate with Zod
    const validated = submitSchema.parse(body);
    
    // Sanitize user-provided strings
    const sanitized = sanitizeObject(validated, {
      title: 200,
      epName: 100,
      condition: 500,
      note: 500,
    });

  const university = getUniversityById(sanitized.universityId);
  const universityName = university?.name ?? sanitized.universityId;

  // Full opportunity object sent from the admin form (for cross-device persistence)
  const fullOpportunity = sanitized.opportunity as Opportunity | undefined;

  const errors: string[] = [];

  // 1. Write summary row to the tracking sheet (OGV / OGT)
  let sheetResult: Awaited<ReturnType<typeof appendOpportunitySubmission>> | null = null;
  try {
    sheetResult = await appendOpportunitySubmission({
      product: sanitized.product,
      opportunityId: sanitized.opportunityId || "",
      opportunityTitle: sanitized.title,
      universityId: sanitized.universityId,
      universityName,
      country: sanitized.country || "",
      duration: sanitized.duration || "",
      opportunityDate: sanitized.opportunityDate || "",
      epName: sanitized.epName || "",
      condition: sanitized.condition || "",
      note: sanitized.note || "",
      source: sanitized.source || "Admin Dashboard",
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
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error("[api/opportunities/submit] error:", error);
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ success: false, error: "Method not allowed." }, { status: 405 });
}
