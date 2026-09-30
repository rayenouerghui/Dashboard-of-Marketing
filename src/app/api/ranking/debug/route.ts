import { NextResponse } from "next/server";
import { fetchPhysicalLeadsRaw, resolveMemberNameValue } from "@/lib/googleSheetsServer";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireRole("admin");

    const rawRows = await fetchPhysicalLeadsRaw();
    const nameCounts = new Map<string, number>();

    for (const r of rawRows) {
      const memberName = resolveMemberNameValue(r);
      if (!memberName) continue;

      nameCounts.set(memberName, (nameCounts.get(memberName) ?? 0) + 1);
    }

    const sorted = Array.from(nameCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));

    return NextResponse.json({
      success: true,
      totalDistinctNames: sorted.length,
      data: sorted,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
