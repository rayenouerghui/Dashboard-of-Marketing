import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import crypto from "crypto";
import { loadScheduledAttractionsFromSheet, archiveScheduledAttractionById } from "@/lib/googleSheetsServer";
import { getCronSecret } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const headerCronSecret = request.headers.get("x-cron-secret");
  const providedSecret = authHeader?.replace("Bearer ", "") || headerCronSecret;
  const cronSecret = getCronSecret();

  if (!providedSecret || !timingSafeEqual(providedSecret, cronSecret)) {
    console.error("[api/cron/cleanup-attractions] Unauthorized access attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  try {
    const attractions = await loadScheduledAttractionsFromSheet();
    const idsToArchive: string[] = [];

    for (const attraction of attractions) {
      const visibility = (() => {
        if (!attraction?.start) return { visible: false, reason: "missing attraction date" };
        const dateValue = String(attraction.start).trim();
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return { visible: false, reason: "invalid attraction date" };
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        endOfDay.setDate(endOfDay.getDate() + 7);
        return { visible: new Date() <= endOfDay, reason: new Date() <= endOfDay ? "within 7-day visibility window" : "date older than 7 days" };
      })();

      if (!visibility.visible) {
        idsToArchive.push(attraction.id);
      }
    }

    const archivedIds: string[] = [];
    for (const id of idsToArchive) {
      const changed = await archiveScheduledAttractionById(id);
      if (changed) archivedIds.push(id);
    }

    revalidateTag("scheduled-attractions", "api/scheduled-attractions");
    console.log(`[api/cron/cleanup-attractions] Archived ${archivedIds.length} old attractions`);

    return NextResponse.json({
      success: true,
      archived: archivedIds.length,
      archivedIds,
    });
  } catch (error) {
    console.error("[api/cron/cleanup-attractions] error:", error);
    return NextResponse.json({ success: false, error: "Failed to cleanup attractions" }, { status: 500 });
  }
}
