import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getApplicationsFromSheets } from "@/lib/server/expaApplicationsFromSheets";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const nocache = new URL(request.url).searchParams.get("nocache") === "1";

  try {
    await requireRole("admin"); // Admin only - contains EP personal data

    const data = await getApplicationsFromSheets(nocache);

    // `success` means the request completed; `degraded` flags a completed run
    // whose EXPA lookups all failed, so consumers can show an error state
    // instead of rendering the empty result as zeros.
    return NextResponse.json({ success: true, ...data }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }

    const message = error instanceof Error ? error.message : "Failed to fetch EP statuses.";
    console.error("[api/expa/applications] error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
