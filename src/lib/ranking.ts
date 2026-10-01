import { isSourceLabel } from "@/data/sourceLabels";
import { formatDateInTunis, parseSubmittedAt, todayInTunis } from "@/lib/dates";
import { resolveMemberNameValue } from "@/lib/googleSheetsServer";

export const RANKING_START_DATE = "2026-09-01";

export interface MemberStat {
  name: string;
  totalLeads: number;
  todayLeads: number;
  applied: number;
  realized: number;
  applicationRate: number;
  realizationRate: number;
}

export interface MemberRankingBuildResult {
  entries: Map<string, { total: number; today: number; expaIds: Set<string> }>;
  members: MemberStat[];
  totalMembers: number;
  totalLeads: number;
  todayLeads: number;
  totalApplied: number;
  totalRealized: number;
}

function todayLocalStr(): string {
  return todayInTunis();
}

function dateStr(raw: unknown): string {
  const parsed = parseSubmittedAt(raw);
  if (!parsed) return "";
  return formatDateInTunis(parsed, "yyyy-MM-dd");
}

export function buildMemberRanking(
  rawRows: Record<string, string>[],
  options: {
    filterUniversity?: string | null;
    cutoff?: string;
    todayOverride?: string;
  } = {},
): MemberRankingBuildResult {
  const {
    filterUniversity = null,
    cutoff = RANKING_START_DATE,
    todayOverride,
  } = options;

  const today = todayOverride ?? todayLocalStr();
  const memberLeads = new Map<string, { total: number; today: number; expaIds: Set<string> }>();

  let globalTotalLeads = 0;
  let globalTodayLeads = 0;
  let unparseableDateRows = 0;

  for (const row of rawRows) {
    const memberName = resolveMemberNameValue(row).trim();
    if (!memberName) continue;

    const submittedAt = row["Submitted at"] || row.submittedAt || row.submitted_at || "";
    const parsedDate = parseSubmittedAt(submittedAt);
    const rowDate = parsedDate ? formatDateInTunis(parsedDate, "yyyy-MM-dd") : "";

    if (!rowDate) {
      if (submittedAt) {
        unparseableDateRows++;
      }
      continue;
    }

    if (rowDate < cutoff) continue;

    if (filterUniversity) {
      const university = (row["University"] || row.university || row.University || "").trim();
      const a = university.toLowerCase();
      const b = filterUniversity.toLowerCase();
      if (!a || !b || !(a === b || a.includes(b) || b.includes(a))) {
        continue;
      }
    }

    const isToday = rowDate === today;
    globalTotalLeads++;
    if (isToday) globalTodayLeads++;

    if (isSourceLabel(memberName)) continue;

    const expaId = (row["EXPA ID"] || row.expaId || row.eXPAID || "").trim();

    if (!memberLeads.has(memberName)) {
      memberLeads.set(memberName, { total: 0, today: 0, expaIds: new Set() });
    }

    const entry = memberLeads.get(memberName)!;
    entry.total++;
    if (isToday) entry.today++;
    if (expaId && /^\d+$/.test(expaId)) entry.expaIds.add(expaId);
  }

  if (unparseableDateRows > 0) {
    console.warn(`${unparseableDateRows} rows skipped: unparseable date`);
  }

  const stats: MemberStat[] = [];
  for (const [name, data] of memberLeads.entries()) {
    stats.push({
      name,
      totalLeads: data.total,
      todayLeads: data.today,
      applied: 0,
      realized: 0,
      applicationRate: 0,
      realizationRate: 0,
    });
  }

  stats.sort((a, b) => b.totalLeads - a.totalLeads || a.name.localeCompare(b.name));

  return {
    entries: memberLeads,
    members: stats,
    totalMembers: stats.length,
    totalLeads: globalTotalLeads,
    todayLeads: globalTodayLeads,
    totalApplied: 0,
    totalRealized: 0,
  };
}
