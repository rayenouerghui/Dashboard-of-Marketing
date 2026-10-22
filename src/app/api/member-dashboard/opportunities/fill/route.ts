import { NextRequest, NextResponse } from "next/server";
import { addSubmission, productToSheet } from "@/lib/submissionsStore";
import { z } from "zod";
import { sanitizeObject } from "@/lib/sanitize";
import { checkIpRateLimit, getClientIp } from "@/lib/auth";

export const dynamic = "force-dynamic";

const fillSchema = z.object({
  product: z.string().min(1).max(50),
  opportunityId: z.string().min(1).max(50),
  opportunityTitle: z.string().min(1).max(200),
  universityId: z.string().min(1).max(50),
  universityName: z.string().min(1).max(100),
  country: z.string().max(100).optional(),
  duration: z.string().max(50).optional(),
  opportunityDate: z.string().max(50).optional(),
  epName: z.string().min(1).max(100),
  condition: z.string().max(500).optional(),
  note: z.string().max(500).optional(),
  source: z.string().max(50).optional(),
  honeypot: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Public endpoint - no authentication required
    // Apply per-IP rate limiting
    const ip = getClientIp(request);
    const rateLimitResult = await checkIpRateLimit(ip);
    if (!rateLimitResult.success) {
      const retryAfter = rateLimitResult.reset 
        ? Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
        : 60; // Default to 1 minute
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { 
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }

    const body = await request.json();
    
    // Validate with Zod
    const validated = fillSchema.parse(body);
    
    // Honeypot check - if filled, it's a bot
    if (validated.honeypot && validated.honeypot.trim() !== "") {
      return NextResponse.json({ success: false, error: "Invalid submission" }, { status: 400 });
    }
    
    // Sanitize user-provided strings
    const sanitized = sanitizeObject(validated, {
      opportunityTitle: 200,
      universityName: 100,
      epName: 100,
      condition: 500,
      note: 500,
    });

    // Record submission to Supabase (handled in addSubmission)
    await addSubmission({
      sheet: productToSheet(sanitized.product),
      product: sanitized.product,
      opportunityId: sanitized.opportunityId,
      opportunityTitle: sanitized.opportunityTitle,
      universityId: sanitized.universityId,
      universityName: sanitized.universityName,
      country: sanitized.country || "",
      duration: sanitized.duration || "",
      opportunityDate: sanitized.opportunityDate || "",
      epName: sanitized.epName,
      condition: sanitized.condition || "",
      note: sanitized.note || "",
      source: sanitized.source || "member-dashboard",
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
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
