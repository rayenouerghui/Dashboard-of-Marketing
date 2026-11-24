import { NextResponse } from "next/server";
import crypto from "crypto";
import { getCronSecret } from "@/lib/env";
import { performExpaRefresh } from "@/lib/server/expaRefresh";

export const dynamic = "force-dynamic";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const headerCronSecret = request.headers.get("x-cron-secret");
    const providedSecret = authHeader?.replace("Bearer ", "") || headerCronSecret;
    const cronSecret = getCronSecret();

    if (!providedSecret || !timingSafeEqual(providedSecret, cronSecret)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const result = await performExpaRefresh();

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[api/cron/expa-refresh] error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "EXPA refresh failed" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ success: false, error: "Method not allowed" }, { status: 405 });
}
