import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { analyzeMemberNameColumn, fetchPhysicalLeadsRaw, normalizeHeaderName } from "@/lib/googleSheetsServer";
import { formatDateInTunis, parseSubmittedAt } from "@/lib/dates";
import { RANKING_START_DATE } from "@/lib/ranking";

export const dynamic = "force-dynamic";

function valueLooksLikePhoneOrEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.includes("@")) return true;
  if (/\d{8,}/.test(trimmed.replace(/\s+/g, ""))) return true;
  return false;
}

function summarizeValues(values: string[]) {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const value = raw.trim();
    if (!value || valueLooksLikePhoneOrEmail(value)) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const ordered = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const topValueShare = ordered.length > 0 ? ordered[0][1] / Math.max(values.filter(Boolean).length, 1) : 0;
  const averageWordCount = values.filter(Boolean).length > 0
    ? values.filter(Boolean).reduce((sum, value) => sum + value.trim().split(/\s+/).filter(Boolean).length, 0) / values.filter(Boolean).length
    : 0;

  return {
    distinctCount: ordered.length,
    topValueShare,
    averageWordCount,
    topValues: ordered.slice(0, 15).map(([value, count]) => ({ value, count })),
  };
}

function isDisplayCandidateHeader(header: string) {
  const normalized = normalizeHeaderName(header);
  if (!normalized) return false;
  if (normalized.includes("email") || normalized.includes("phone") || normalized.includes("firstname") || normalized.includes("lastname") || normalized.includes("submissionid") || normalized.includes("expaid") || normalized.includes("respondentid") || normalized.includes("satus") || normalized.includes("submittedat") || normalized.includes("date")) return false;
  if (normalized.includes("email") || normalized.includes("phone") || normalized.includes("fname") || normalized.includes("lname") || normalized.includes("id")) return false;
  return true;
}

function summarizeCandidateColumns(rows: Record<string, string>[]) {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const candidateHeaders = headers.filter((header) => isDisplayCandidateHeader(header));

  return candidateHeaders.map((header) => {
    const allValues = rows.map((row) => String(row[header] ?? "").trim());
    const sinceValues = rows
      .filter((row) => {
        const raw = row["Submitted at"] || row.submittedAt || row.submitted_at || "";
        if (!raw) return false;
        const parsed = parseSubmittedAt(raw);
        if (!parsed) return false;
        return formatDateInTunis(parsed, "yyyy-MM-dd") >= RANKING_START_DATE;
      })
      .map((row) => String(row[header] ?? "").trim());

    return {
      header,
      all: summarizeValues(allValues),
      sinceCutoff: summarizeValues(sinceValues),
    };
  });
}

export async function GET() {
  try {
    await requireRole("admin");

    const rows = await fetchPhysicalLeadsRaw();
    const headers = rows[0] ? Object.keys(rows[0]) : [];
    const audit = analyzeMemberNameColumn(rows, { cutoff: RANKING_START_DATE });
    const dateSamples = rows
      .map((row) => String(row["Submitted at"] || row.submittedAt || row.submitted_at || "").trim())
      .filter(Boolean)
      .map((value) => parseSubmittedAt(value))
      .filter((value): value is Date => Boolean(value))
      .slice(0, 5)
      .map((date) => date.toISOString().slice(0, 10));
    const rowsSinceCutoff = rows.filter((row) => {
      const value = String(row["Submitted at"] || row.submittedAt || row.submitted_at || "").trim();
      const parsed = parseSubmittedAt(value);
      if (!parsed) return false;
      return formatDateInTunis(parsed, "yyyy-MM-dd") >= RANKING_START_DATE;
    }).length;

    return NextResponse.json({
      success: true,
      headers,
      match: audit.nameColumnHeader ?? null,
      audit,
      candidateColumns: summarizeCandidateColumns(rows),
      dateSamples,
      meta: {
        since: RANKING_START_DATE,
        rowsRead: rows.length,
        totalRowsInSheet: rows.length,
        rowsSinceCutoff,
        generatedAt: new Date().toISOString(),
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
