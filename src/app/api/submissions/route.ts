import { NextRequest, NextResponse } from "next/server";
import { getSubmissions, getAllSubmissions } from "@/lib/submissionsStore";

export const dynamic = "force-dynamic";

const PIN_OGV = "12345";
const PIN_OGT = "012345";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pin = searchParams.get("pin") ?? "";
  const sheet = searchParams.get("sheet") as "OGV" | "OGT" | "ALL" | null;

  if (pin === PIN_OGV && (sheet === "OGV" || !sheet)) {
    return NextResponse.json({ success: true, sheet: "OGV", submissions: getSubmissions("OGV") });
  }

  if (pin === PIN_OGT && (sheet === "OGT" || !sheet)) {
    return NextResponse.json({ success: true, sheet: "OGT", submissions: getSubmissions("OGT") });
  }

  // Admin master PIN — shows all (either PIN works for their own sheet)
  if (pin === PIN_OGV || pin === PIN_OGT) {
    const sub = pin === PIN_OGV ? getSubmissions("OGV") : getSubmissions("OGT");
    return NextResponse.json({ success: true, sheet: pin === PIN_OGV ? "OGV" : "OGT", submissions: sub });
  }

  return NextResponse.json({ success: false, error: "Invalid PIN." }, { status: 401 });
}
