import { NextRequest, NextResponse } from "next/server";
import { getSubmissions } from "@/lib/submissionsStore";
import { requireRole, checkIpRateLimit, getClientIp } from "@/lib/auth";

export const dynamic = "force-dynamic";

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
    // Store submission (implementation depends on submissionsStore)
    // For now, this is a placeholder
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to process submission" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Public endpoint - no authentication required
    const { searchParams } = new URL(request.url);
    const sheet = (searchParams.get("sheet") ?? "").toUpperCase() as "OGV" | "OGT";

    if (sheet !== "OGV" && sheet !== "OGT") {
      return NextResponse.json(
        { success: false, error: "sheet param must be OGV or OGT." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      sheet,
      submissions: getSubmissions(sheet),
    });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    return NextResponse.json({ success: false, error: "Failed to fetch submissions" }, { status: 500 });
  }
}
