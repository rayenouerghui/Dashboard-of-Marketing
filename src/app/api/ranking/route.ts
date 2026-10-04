import { NextResponse } from "next/server";
import { SHEET_LAYOUT_VERSION } from "@/data/sheetsConfig";
import { buildMemberRanking, RANKING_START_DATE } from "@/lib/ranking";
import { analyzeMemberNameColumn, fetchPhysicalLeadsRaw } from "@/lib/googleSheetsServer";

export const dynamic = "force-dynamic";

export interface MemberStat {
  name: string;
  totalLeads: number;
  todayLeads: number;
}

function buildRankingMeta({
  nameColumnHeader,
  nameColumnIndex,
  nameColumnSource,
  referralColumnIndex,
  rowsRead,
  totalRowsInSheet,
  rowsAfterDateCutoff,
  rowsSinceCutoff,
  rowsSkippedUnparseableDate,
  rowsSkippedSourceLabel,
  rowsSkippedBlankName,
  membersCounted,
  gridRowCount,
  dataRowCount,
  sheetGridFull,
}: {
  nameColumnHeader: string | null;
  nameColumnIndex: number | null;
  nameColumnSource: "env-index" | "env-header" | "default-index" | "detected" | null;
  referralColumnIndex: number | null;
  rowsRead: number;
  totalRowsInSheet: number;
  rowsAfterDateCutoff: number;
  rowsSinceCutoff: number;
  rowsSkippedUnparseableDate: number;
  rowsSkippedSourceLabel: number;
  rowsSkippedBlankName: number;
  membersCounted: number;
  gridRowCount: number;
  dataRowCount: number;
  sheetGridFull: boolean;
}) {
  return {
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    since: RANKING_START_DATE,
    layoutVersion: SHEET_LAYOUT_VERSION,
    nameColumnHeader,
    nameColumnIndex,
    nameColumnSource,
    referralColumnIndex,
    rowsRead,
    totalRowsInSheet,
    rowsAfterDateCutoff,
    rowsSinceCutoff,
    rowsSkippedUnparseableDate,
    rowsSkippedSourceLabel,
    rowsSkippedBlankName,
    membersCounted,
    gridRowCount,
    dataRowCount,
    sheetGridFull,
    warning: sheetGridFull ? "the sheet has no free rows left; new signups may be failing" : null,
    updatedAt: new Date().toISOString(),
    source: process.env.GOOGLE_SHEET_ID ? "google-sheet" : "fallback-json",
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterUniversity = searchParams.get("university")?.trim() || null;

    const rawRows = await fetchPhysicalLeadsRaw();
    const totalRowsInSheet = rawRows.length;
    const nameAudit = analyzeMemberNameColumn(rawRows, { cutoff: RANKING_START_DATE });

    if (!nameAudit.valid || !nameAudit.nameColumnHeader) {
      console.warn("[api/ranking] MEMBER_NAME_COLUMN_NOT_FOUND; headersSeen=" + JSON.stringify(nameAudit.headersSeen));
      return NextResponse.json({
        success: false,
        error: "MEMBER_NAME_COLUMN_NOT_FOUND",
        headersSeen: nameAudit.headersSeen,
        meta: buildRankingMeta({
          nameColumnHeader: null,
          nameColumnIndex: null,
          nameColumnSource: null,
          referralColumnIndex: null,
          rowsRead: rawRows.length,
          totalRowsInSheet,
          rowsAfterDateCutoff: 0,
          rowsSinceCutoff: nameAudit.rowsSinceCutoff ?? 0,
          rowsSkippedUnparseableDate: 0,
          rowsSkippedSourceLabel: 0,
          rowsSkippedBlankName: 0,
          membersCounted: 0,
          gridRowCount: Math.max(rawRows.length + 1, 1),
          dataRowCount: rawRows.length,
          sheetGridFull: rawRows.length + 1 >= Math.max(rawRows.length + 1, 1),
        }),
      }, { status: 422 });
    }

    const rankingBase = buildMemberRanking(rawRows, {
      filterUniversity,
      cutoff: RANKING_START_DATE,
    });

    const members = [...rankingBase.members].sort((a, b) => b.totalLeads - a.totalLeads || a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      members,
      totalMembers: members.length,
      totalLeads: rankingBase.totalLeads,
      todayLeads: rankingBase.todayLeads,
      generatedAt: new Date().toISOString(),
      cached: false,
      meta: buildRankingMeta({
        nameColumnHeader: rankingBase.nameColumnHeader,
        nameColumnIndex: rankingBase.nameColumnIndex,
        nameColumnSource: rankingBase.nameColumnSource,
        referralColumnIndex: rankingBase.referralColumnIndex,
        rowsRead: rankingBase.rowsRead,
        totalRowsInSheet,
        rowsAfterDateCutoff: rankingBase.rowsAfterDateCutoff,
        rowsSinceCutoff: rankingBase.rowsSinceCutoff,
        rowsSkippedUnparseableDate: rankingBase.rowsSkippedUnparseableDate,
        rowsSkippedSourceLabel: rankingBase.rowsSkippedSourceLabel,
        rowsSkippedBlankName: rankingBase.rowsSkippedBlankName,
        membersCounted: rankingBase.members.length,
        gridRowCount: rankingBase.gridRowCount,
        dataRowCount: rankingBase.dataRowCount,
        sheetGridFull: rankingBase.sheetGridFull,
      }),
    });
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }

    const msg = error instanceof Error ? error.message : "Failed to compute rankings.";
    console.error("[api/ranking] error:", error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
