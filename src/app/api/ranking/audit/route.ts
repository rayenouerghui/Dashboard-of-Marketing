import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { analyzeMemberNameColumn, fetchPhysicalLeadsRaw, normalizeHeaderName } from "@/lib/googleSheetsServer";
import { parseSubmittedAt } from "@/lib/dates";

export const dynamic = "force-dynamic";

function valueLooksLikePhoneOrEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.includes("@")) return true;
  if (/\d{8,}/.test(trimmed.replace(/\s+/g, ""))) return true;
  return false;
}

function summarizeCandidateColumns(rows: Record<string, string>[]) {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const candidates = headers.filter((header) => {
    const normalized = normalizeHeaderName(header);
    if (!normalized) return false;
    if (normalized.includes("hear") || normalized.includes("source") || normalized.includes("channel") || normalized.includes("referral") || normalized.includes("where")) {
      return false;
    }
    return normalized.includes("member") || normalized.includes("attracted") || normalized.includes("consultant") || normalized.includes("owner") || normalized.includes("manager") || normalized.includes("fullname");
  });

  return candidates.map((header) => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const value = String(row[header] ?? "").trim();
      if (!value || valueLooksLikePhoneOrEmail(value)) continue;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    return {
      header,
      topValues: Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 10)
        .map(([value, count]) => ({ value, count })),
    };
  });
}

export async function GET() {
  try {
    await requireRole("admin");

    const rows = await fetchPhysicalLeadsRaw();
    const headers = rows[0] ? Object.keys(rows[0]) : [];
    const audit = analyzeMemberNameColumn(rows);
    const dateSamples = rows
      .map((row) => String(row["Submitted at"] || row.submittedAt || row.submitted_at || "").trim())
      .filter(Boolean)
      .map((value) => parseSubmittedAt(value))
      .filter((value): value is Date => Boolean(value))
      .slice(0, 5)
      .map((date) => date.toISOString().slice(0, 10));

    return NextResponse.json({
      success: true,
      headers,
      match: audit.nameColumnHeader ?? null,
      audit,
      candidateColumns: summarizeCandidateColumns(rows),
      dateSamples,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
