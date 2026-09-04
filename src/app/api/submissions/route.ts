import { NextRequest, NextResponse } from "next/server";
import { getSubmissions } from "@/lib/submissionsStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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
}
