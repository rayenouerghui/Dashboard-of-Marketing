import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAttractionsSheetConfig, getAttractionsSpreadsheetIdHint, getScheduledAttractionsAuditRows } from "@/lib/googleSheetsServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("admin");
    const { tabName } = getAttractionsSheetConfig();
    const rows = await getScheduledAttractionsAuditRows();

    return NextResponse.json({
      spreadsheetIdHint: getAttractionsSpreadsheetIdHint(),
      tabName,
      rowCount: rows.length,
      rows,
    });
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    console.error("[api/scheduled-attractions/audit] error:", error);
    return NextResponse.json({ error: "Failed to audit scheduled attractions" }, { status: 500 });
  }
}
