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
    const { searchParams } = new URL(request.url);
    const pin = searchParams.get("pin")?.trim();
    const sheetParam = searchParams.get("sheet")?.trim().toUpperCase() as "OGV" | "OGT";

    // PIN-based authentication (used by admin viewer)
    if (pin) {
      const SHEET_PINS: Record<string, "OGV" | "OGT"> = {
        "12345": "OGV",
        "012345": "OGT",
      };
      const sheet = SHEET_PINS[pin];
      if (!sheet) {
        return NextResponse.json(
          { success: false, error: "Invalid PIN." },
          { status: 401 }
        );
      }
      const submissions = await getSubmissions(sheet);
      return NextResponse.json({
        success: true,
        sheet,
        submissions,
      });
    }

    // Direct sheet parameter (fallback)
    if (sheetParam && sheetParam !== "OGV" && sheetParam !== "OGT") {
      return NextResponse.json(
        { success: false, error: "sheet param must be OGV or OGT." },
        { status: 400 }
      );
    }

    if (sheetParam) {
      const submissions = await getSubmissions(sheetParam);
      return NextResponse.json({
        success: true,
        sheet: sheetParam,
        submissions,
      });
    }

    return NextResponse.json(
      { success: false, error: "Either pin or sheet parameter is required." },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    return NextResponse.json({ success: false, error: "Failed to fetch submissions" }, { status: 500 });
  }
}
