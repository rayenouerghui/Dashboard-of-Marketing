import { NextResponse } from "next/server";
import { analyzeMemberNameColumn, fetchPhysicalLeadsRaw } from "@/lib/googleSheetsServer";
import { fetchApplicationsForLeads } from "@/lib/server/expaApplicationsClient";
import { unstable_cache } from "next/cache";
import type { LeadInput } from "@/lib/server/expaApplicationsClient";
import { SHEET_LAYOUT_VERSION } from "@/data/sheetsConfig";
import { buildMemberRanking, RANKING_START_DATE } from "@/lib/ranking";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface MemberStat {
  name:            string;
  totalLeads:      number;
  todayLeads:      number;
  applied:         number;
  realized:        number;
  applicationRate: number;
  realizationRate: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const APPLIED_STATUSES  = new Set(["open","accepted","approved","approved_ep_manager","matched","realized","completed","finished"]);
const REALIZED_STATUSES = new Set(["realized","completed","finished"]);

// Only count leads submitted on or after this date — everything before is reset to zero
const RANKING_CACHE_KEY = ["ranking-expa-statuses", RANKING_START_DATE, SHEET_LAYOUT_VERSION];

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

// ─── Cache EXPA lookup for 15 min — it's the slow part ───────────────────────
const getCachedExpaStatuses = unstable_cache(
  async (expaIds: string[]): Promise<Record<string, string>> => {
    if (expaIds.length === 0) return {};
    const leadInputs: LeadInput[] = expaIds.map((id) => ({
      expaId: id, firstName: "", lastName: "", email: "", university: "",
      source: "physical" as const,
    }));
    const { applications } = await fetchApplicationsForLeads(leadInputs);
    const map: Record<string, string> = {};
    for (const a of applications) map[a.epId] = a.status;
    return map;
  },
  RANKING_CACHE_KEY,
  { revalidate: 900 } // 15 min
);

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    // Public endpoint - no authentication required
    const { searchParams } = new URL(request.url);
    // ?expa=0 skips EXPA lookup entirely — returns sheet data immediately
    const skipExpa = searchParams.get("expa") === "0";
    // ?university=ESPRIT filters leads to only that university
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

    const memberLeads = rankingBase.entries;

    // EXPA lookup — use cache, skip if ?expa=0
    let expaStatusByEpId: Record<string, string> = {};
    if (!skipExpa) {
      try {
        const allExpaIds = new Set<string>();
        for (const data of memberLeads.values()) {
          for (const id of data.expaIds) allExpaIds.add(id);
        }
        if (allExpaIds.size > 0) {
          // Sort for stable cache key
          const sortedIds = Array.from(allExpaIds).sort();
          expaStatusByEpId = await getCachedExpaStatuses(sortedIds);
        }
      } catch (err) {
        console.warn("[api/ranking] EXPA lookup failed (non-fatal):", err);
      }
    }

    const stats: MemberStat[] = [];
    for (const [name, data] of memberLeads.entries()) {
      let applied = 0, realized = 0;
      for (const epId of data.expaIds) {
        const status = expaStatusByEpId[epId];
        if (!status) continue;
        if (APPLIED_STATUSES.has(status))  applied++;
        if (REALIZED_STATUSES.has(status)) realized++;
      }
      stats.push({
        name,
        totalLeads:      data.total,
        todayLeads:      data.today,
        applied,
        realized,
        applicationRate: data.total > 0 ? (applied  / data.total) * 100 : 0,
        realizationRate: data.total > 0 ? (realized / data.total) * 100 : 0,
      });
    }

    stats.sort((a, b) => b.totalLeads - a.totalLeads || a.name.localeCompare(b.name));

    return NextResponse.json({
      success:       true,
      members:       stats,
      totalMembers:  stats.length,
      totalLeads:    rankingBase.totalLeads,
      todayLeads:    rankingBase.todayLeads,
      totalApplied:  stats.reduce((s, m) => s + m.applied,     0),
      totalRealized: stats.reduce((s, m) => s + m.realized,    0),
      generatedAt:   new Date().toISOString(),
      cached:        !skipExpa,
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
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 });
    }
    const msg = error instanceof Error ? error.message : "Failed to compute rankings.";
    console.error("[api/ranking] error:", error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
