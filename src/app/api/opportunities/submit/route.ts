import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, hasSupabaseConfig } from "@/lib/supabase";
import { addSubmission, productToSheet } from "@/lib/submissionsStore";
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

  // 1. Write submission to Supabase submissions table
  try {
    await addSubmission({
      sheet: productToSheet(sanitized.product),
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
    errors.push(`Submissions table: ${err instanceof Error ? err.message : String(err)}`);
    console.error("[api/opportunities/submit] submissions error:", err);
  }

  // 2. Persist full opportunity object to Supabase opportunities table (for member reads)
  if (fullOpportunity && hasSupabaseConfig()) {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { error } = await supabase
          .from("opportunities")
          .upsert({
            id: fullOpportunity.id,
            university_id: fullOpportunity.universityId,
            title: fullOpportunity.title,
            product: fullOpportunity.product,
            country: fullOpportunity.country,
            duration: fullOpportunity.duration,
            opportunity_date: fullOpportunity.date,
            benefits: JSON.stringify(fullOpportunity.benefits || []),
            requirements: JSON.stringify(fullOpportunity.requirements || []),
            updated_at: new Date().toISOString(),
          }, { onConflict: "id" });
        
        if (error) throw error;
      }
    } catch (err) {
      errors.push(`Opportunities table: ${err instanceof Error ? err.message : String(err)}`);
      console.error("[api/opportunities/submit] opportunities error:", err);
    }
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { success: false, error: errors.join(" | ") },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
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
