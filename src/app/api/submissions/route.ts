import { NextRequest, NextResponse } from "next/server";
import { getSubmissions } from "@/lib/submissionsStore";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await requireRole('member'); // Member or admin can submit
    const body = await request.json();
    // Store submission (implementation depends on submissionsStore)
    // For now, this is a placeholder
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    return NextResponse.json({ success: false, error: "Failed to process submission" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireRole('member'); // Member or admin can read
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
