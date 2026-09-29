import { NextResponse } from "next/server";
import { loadScheduledAttractionsFromSheet, deleteScheduledAttractionFromSheet } from "@/lib/googleSheetsServer";
import { env } from "@/lib/env";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Verify CRON_SECRET header with timing-safe comparison
  const authHeader = request.headers.get("authorization");
  const cronSecret = request.headers.get("x-cron-secret");
  
  const providedSecret = authHeader?.replace("Bearer ", "") || cronSecret;
  
  // Timing-safe comparison to prevent timing attacks
  if (!providedSecret || !timingSafeEqual(providedSecret, env.CRON_SECRET)) {
    console.error("[api/cron/cleanup-attractions] Unauthorized access attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  try {
    const attractions = await loadScheduledAttractionsFromSheet();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];

    const idsToDelete: string[] = [];

    for (const attraction of attractions) {
      const attractionDate = attraction.start || attraction.date;
      if (attractionDate && attractionDate < oneWeekAgoStr) {
        idsToDelete.push(attraction.id);
      }
    }

    // Delete old attractions
    for (const id of idsToDelete) {
      await deleteScheduledAttractionFromSheet(id);
    }

    console.log(`[api/cron/cleanup-attractions] Deleted ${idsToDelete.length} old attractions`);

    return NextResponse.json({
      success: true,
      deleted: idsToDelete.length,
      deletedIds: idsToDelete,
    });
  } catch (error) {
    console.error("[api/cron/cleanup-attractions] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cleanup attractions" },
      { status: 500 }
    );
  }
}
