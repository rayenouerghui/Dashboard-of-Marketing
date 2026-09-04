import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchAllExpaApplications } from "@/lib/server/expaApplicationsClient";

export const dynamic = "force-dynamic";

// Cache for 10 minutes — EXPA data doesn't change second-by-second and
// the full pagination fetch can be expensive (several seconds).
const getCachedApplications = unstable_cache(
  async (fromDate: string) => fetchAllExpaApplications(fromDate),
  ["expa-applications"],
  { revalidate: 600 } // 10 min
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  // Allow caller to choose how far back to look. Default: start of this year.
  const from = searchParams.get("from") ?? `${new Date().getFullYear()}-01-01`;

  // ?nocache=1 busts the cache for manual refresh
  const noCache = searchParams.get("nocache") === "1";

  try {
    const result = noCache
      ? await fetchAllExpaApplications(from)
      : await getCachedApplications(from);

    return NextResponse.json(
      {
        success: true,
        totalItems: result.totalItems,
        count: result.applications.length,
        applications: result.applications,
        from,
        cachedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch applications from EXPA.";
    console.error("[api/expa/applications] error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
