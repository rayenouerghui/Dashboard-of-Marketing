import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { analyzeMemberNameColumn, fetchPhysicalLeadsRaw, normalizeHeaderName, resolveMemberNameKeyForRows } from "@/lib/googleSheetsServer";
import { formatDateInTunis, parseSubmittedAt } from "@/lib/dates";
import { buildMemberRanking, RANKING_START_DATE } from "@/lib/ranking";

export const dynamic = "force-dynamic";

function valueLooksLikePhoneOrEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.includes("@")) return true;
  if (/\d{8,}/.test(trimmed.replace(/\s+/g, ""))) return true;
  return false;
}

function isSensitiveHeader(header: string): boolean {
  const normalized = normalizeHeaderName(header);
  if (!normalized) return true;
  if (normalized.includes("email") || normalized.includes("phone") || normalized.includes("firstname") || normalized.includes("lastname") || normalized.includes("submissionid") || normalized.includes("respondentid") || normalized.includes("expaid") || normalized.includes("status") || normalized.includes("submittedat") || normalized.includes("date")) return true;
  return false;
}

function summarizeValues(values: string[]) {
  const counts = new Map<string, number>();
  const cleaned = values.map((value) => value.trim()).filter((value) => value.length > 0 && !valueLooksLikePhoneOrEmail(value));
  for (const value of cleaned) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const ordered = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const avgWordCount = cleaned.length > 0
    ? cleaned.reduce((sum, value) => sum + value.split(/\s+/).filter(Boolean).length, 0) / cleaned.length
    : 0;
  return {
    distinctCount: ordered.length,
    avgWordCount,
    topValues: ordered.slice(0, 10).map(([value, count]) => ({ value, count })),
    topValueShare: ordered.length > 0 ? ordered[0][1] / Math.max(cleaned.length, 1) : 0,
  };
}

function classifyAuditValues(values: string[], header: string): "person names" | "referral answers" | "dates" | "yes-no" | "no data" {
  const cleaned = values.map((value) => value.trim()).filter((value) => value.length > 0 && !valueLooksLikePhoneOrEmail(value));
  if (cleaned.length === 0) return "no data";

  const normalizedHeader = normalizeHeaderName(header);
  if (normalizedHeader.includes("yes") || normalizedHeader.includes("interested") || normalizedHeader.includes("available") || normalizedHeader.includes("business") || normalizedHeader.includes("ai")) {
    const yesNoValues = new Set(["yes", "no", "y", "n", "true", "false", "1", "0"]);
    const allYesNo = cleaned.every((value) => yesNoValues.has(value.toLowerCase().trim()));
    if (allYesNo) return "yes-no";
    return "dates";
  }

  const distinct = new Set(cleaned.map((value) => value.toLowerCase().trim()));
  const averageWords = cleaned.reduce((sum, value) => sum + value.split(/\s+/).filter(Boolean).length, 0) / cleaned.length;
  const topShare = cleaned.length > 0 ? Math.max(...Array.from(distinct).map((value) => cleaned.filter((item) => item.toLowerCase().trim() === value).length)) / cleaned.length : 0;
  const isLikelyNames = cleaned.every((value) => /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' -]*$/.test(value.replace(/\s+/g, " ").trim())) && averageWords >= 1 && averageWords <= 4 && distinct.size >= 2 && topShare < 0.7;
  if (isLikelyNames) return "person names";

  const referralSignals = ["information booth", "friend", "classroom", "presentation", "facebook", "instagram", "event", "other", "poster", "flyer", "social media", "referral", "walk in", "google"];
  const isReferralLike = cleaned.some((value) => referralSignals.some((signal) => value.toLowerCase().includes(signal))) || averageWords > 3 || distinct.size <= 6;
  if (isReferralLike) return "referral answers";

  if (cleaned.some((value) => /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|available|week|month|day|morning|afternoon|evening/i.test(value))) {
    return "dates";
  }

  return "referral answers";
}

function getRowsSinceCutoff(rows: Record<string, string>[]) {
  return rows.filter((row) => {
    const raw = row["Submitted at"] || row.submittedAt || row.submitted_at || "";
    const parsed = parseSubmittedAt(raw);
    if (!parsed) return false;
    return formatDateInTunis(parsed, "yyyy-MM-dd") >= RANKING_START_DATE;
  });
}

function summarizeLayoutColumns(rows: Record<string, string>[]) {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const sinceCutoffRows = getRowsSinceCutoff(rows);
  const inspectIndexes = [15, 16, 17, 18, 19];

  return inspectIndexes
    .map((index) => ({ index, header: headers[index - 1] ?? null }))
    .filter(({ header }) => header && !isSensitiveHeader(String(header)))
    .map(({ index, header }) => {
      const values = sinceCutoffRows.map((row) => String(row[String(header)] ?? "")).filter((value) => value.trim() !== "");
      const summary = summarizeValues(values);
      return {
        columnIndex: index,
        header: String(header),
        distinctCount: summary.distinctCount,
        topValues: summary.topValues,
        averageWordCount: summary.avgWordCount,
        verdict: classifyAuditValues(values, String(header)),
      };
    });
}

function getWeeklyBuckets(rows: Record<string, string>[]) {
  const buckets = new Map<string, Record<string, string>[]>();
  for (const row of rows) {
    const raw = row["Submitted at"] || row.submittedAt || row.submitted_at || "";
    const parsed = parseSubmittedAt(raw);
    if (!parsed) continue;
    const date = new Date(parsed);
    const day = date.getDay();
    const diffToMonday = (day + 6) % 7;
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - diffToMonday);
    const key = formatDateInTunis(startOfWeek, "yyyy-MM-dd");
    const existing = buckets.get(key) ?? [];
    existing.push(row);
    buckets.set(key, existing);
  }
  return Array.from(buckets.entries()).sort(([left], [right]) => left.localeCompare(right));
}

export async function GET() {
  try {
    await requireRole("admin");

    const rows = await fetchPhysicalLeadsRaw();
    const headers = rows[0] ? Object.keys(rows[0]) : [];
    const sinceCutoffRows = getRowsSinceCutoff(rows);
    const audit = analyzeMemberNameColumn(rows, { cutoff: RANKING_START_DATE });
    const selectedHeader = resolveMemberNameKeyForRows(rows, RANKING_START_DATE);
    const selectedValues = selectedHeader
      ? sinceCutoffRows.map((row) => String(row[selectedHeader] ?? "").trim()).filter(Boolean)
      : [];
    const selectedSummary = selectedHeader ? summarizeValues(selectedValues) : null;
    const rankingBase = buildMemberRanking(rows, { cutoff: RANKING_START_DATE });
    const topMembers = rankingBase.members.slice(0, 10).map((member) => ({
      name: member.name,
      count: member.totalLeads,
    }));
    const weekly = getWeeklyBuckets(sinceCutoffRows).map(([weekStart, bucketRows]) => {
      const result: Record<string, unknown> = { weekStart };
      const indexesToInspect = [17, 18];
      for (const index of indexesToInspect) {
        const header = headers[index - 1];
        if (!header) continue;
        const values = bucketRows.map((row) => String(row[header] ?? "").trim()).filter(Boolean);
        result[`${index}`] = {
          header,
          distinctCount: new Set(values.map((value) => value.toLowerCase().trim())).size,
          verdict: classifyAuditValues(values, header),
          topValues: summarizeValues(values).topValues,
        };
      }
      return result;
    });
    const sheetGridFull = rankingBase.dataRowCount + 1 >= rankingBase.gridRowCount;

    return NextResponse.json({
      success: true,
      headers,
      selectedTab: "Physical Data",
      match: audit.nameColumnHeader ?? null,
      audit,
      selectedNameColumn: selectedHeader,
      selectedNameSummary: selectedHeader ? {
        header: selectedHeader,
        distinctCount: selectedSummary?.distinctCount ?? 0,
        topValues: selectedSummary?.topValues ?? [],
        averageWordCount: selectedSummary?.avgWordCount ?? 0,
        verdict: selectedHeader ? classifyAuditValues(selectedValues, selectedHeader) : "no data",
      } : null,
      layoutCheck: summarizeLayoutColumns(rows),
      weekly,
      topMembers,
      meta: {
        since: RANKING_START_DATE,
        rowsRead: rows.length,
        rowsSinceCutoff: sinceCutoffRows.length,
        nameColumnIndex: rankingBase.nameColumnIndex,
        nameColumnHeader: rankingBase.nameColumnHeader,
        referralColumnIndex: rankingBase.referralColumnIndex,
        gridRowCount: rankingBase.gridRowCount,
        dataRowCount: rankingBase.dataRowCount,
        sheetGridFull,
        warning: sheetGridFull ? "the sheet has no free rows left; new signups may be failing" : null,
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
