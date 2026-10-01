import { isSourceLabel } from "@/data/sourceLabels";
import { resolveMemberNameValue } from "@/lib/googleSheetsServer";

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
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateStr(iso: string): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
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
    cutoff = "2026-09-07",
    todayOverride,
  } = options;

  const today = todayOverride ?? todayLocalStr();
  const memberLeads = new Map<string, { total: number; today: number; expaIds: Set<string> }>();

  let globalTotalLeads = 0;
  let globalTodayLeads = 0;

  for (const row of rawRows) {
    const memberName = resolveMemberNameValue(row).trim();
    if (!memberName) continue;

    const submittedAt = row["Submitted at"] || row.submittedAt || row.submitted_at || "";
    const rowDate = dateStr(submittedAt);

    if (!rowDate || rowDate < cutoff) continue;

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
