import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { formatDateInTunis, parseSubmittedAt } from "@/lib/dates";
import { getGoogleApis, normalizeHeaderName } from "@/lib/googleSheetsServer";
import { getGoogleSheetId, getGoogleSheetsClientEmail, getGoogleSheetsPrivateKey } from "@/lib/env";

export const dynamic = "force-dynamic";

function summarizeTab(rows: string[][]) {
  const [headerRow = [], ...dataRows] = rows;
  const headers = headerRow.map((cell) => String(cell ?? "").trim());
  const data = dataRows.filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));

  let earliest: Date | null = null;
  let latest: Date | null = null;
  let rowsSinceCutoff = 0;
  const submitIndex = headers.findIndex((header) => normalizeHeaderName(header).includes("submittedat"));

  for (const row of data) {
    const rawSubmittedAt = submitIndex >= 0 ? row[submitIndex] ?? "" : "";
    const parsed = parseSubmittedAt(rawSubmittedAt);
    if (!parsed) continue;
    if (!earliest || parsed.getTime() < earliest.getTime()) earliest = parsed;
    if (!latest || parsed.getTime() > latest.getTime()) latest = parsed;
    const day = formatDateInTunis(parsed, "yyyy-MM-dd");
    if (day >= "2026-09-01") rowsSinceCutoff++;
  }

  return {
    headers,
    rowCount: data.length,
    earliest: earliest ? formatDateInTunis(earliest, "yyyy-MM-dd") : null,
    latest: latest ? formatDateInTunis(latest, "yyyy-MM-dd") : null,
    rowsSinceCutoff,
    hasBusinessAi: headers.some((header) => normalizeHeaderName(header).includes("business") && normalizeHeaderName(header).includes("ai")),
  };
}

export async function GET() {
  try {
    await requireRole("admin");

    const sheetId = getGoogleSheetId();
    const clientEmail = getGoogleSheetsClientEmail();
    const privateKey = getGoogleSheetsPrivateKey().replace(/\\n/g, "\n");
    const google = await getGoogleApis();
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    const meta = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
      fields: "sheets(properties(title,gridProperties))",
    });

    const tabs = (meta.data.sheets ?? []).map((sheet: any) => sheet?.properties?.title).filter((title: unknown): title is string => typeof title === "string" && title.length > 0);
    const payload = await Promise.all(
      tabs.map(async (tabName) => {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: `'${tabName.replace(/'/g, "''")}'!A:Z`,
        });
        const rows = response.data.values ?? [];
        return {
          tabName,
          gridRowCount: rows.length,
          ...summarizeTab(rows),
        };
      }),
    );

    return NextResponse.json({
      success: true,
      spreadsheetIdHint: `${sheetId.slice(0, 4)}...${sheetId.slice(-4)}`,
      tabs: payload,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    const message = error instanceof Error ? error.message : "Failed to inspect sheet tabs.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
