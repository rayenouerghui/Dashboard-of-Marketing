import { NextResponse } from "next/server";
import { fetchPhysicalLeadsRaw } from "@/lib/googleSheetsServer";
import { fetchApplicationsForLeads } from "@/lib/server/expaApplicationsClient";
import type { LeadInput } from "@/lib/server/expaApplicationsClient";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface MemberStat {
  name:           string;
  totalLeads:     number;   // all physical leads attributed to this member
  todayLeads:     number;   // leads today (UTC-aware local date)
  applied:        number;   // EPs from this member who have an EXPA application
  realized:       number;   // EPs from this member who reached realized/completed/finished
  applicationRate: number;  // applied / totalLeads * 100
  realizationRate: number;  // realized / totalLeads * 100
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// EXPA statuses that count as "applied"
const APPLIED_STATUSES = new Set([
  "open", "accepted", "approved", "approved_ep_manager",
  "matched", "realized", "completed", "finished",
]);

// EXPA statuses that count as "realized"
const REALIZED_STATUSES = new Set(["realized", "completed", "finished"]);

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const today = todayLocalStr();

    // 1. Fetch live physical leads from the sheet
    const rawRows = await fetchPhysicalLeadsRaw();

    // 2. Build member → leads mapping
    // key: memberName (trimmed), value: array of expaIds for that member
    const memberLeads = new Map<string, {
      total:   number;
      today:   number;
      expaIds: Set<string>;
    }>();

    for (const r of rawRows) {
      const memberName = (
        r["🙋Member Name"] ||
        r.memberName      ||
        r.member_name     ||
        ""
      ).trim();

      if (!memberName) continue;

      const submittedAt = r["Submitted at"] || r.submittedAt || r.submitted_at || "";
      const expaId      = (r["EXPA ID"] || r.expaId || r.eXPAID || "").trim();
      const isToday     = dateStr(submittedAt) === today;

      if (!memberLeads.has(memberName)) {
        memberLeads.set(memberName, { total: 0, today: 0, expaIds: new Set() });
      }
      const entry = memberLeads.get(memberName)!;
      entry.total++;
      if (isToday) entry.today++;
      if (expaId && /^\d+$/.test(expaId)) entry.expaIds.add(expaId);
    }

    // 3. Fetch EXPA application statuses directly (no HTTP self-call)
    let expaStatusByEpId: Map<string, string> = new Map();
    try {
      // Collect all unique expaIds across all members
      const allExpaIds = new Set<string>();
      for (const data of memberLeads.values()) {
        for (const id of data.expaIds) allExpaIds.add(id);
      }

      if (allExpaIds.size > 0) {
        // Build LeadInput array — one entry per unique expaId
        const leadInputs: LeadInput[] = Array.from(allExpaIds).map((id) => ({
          expaId:    id,
          firstName: "",
          lastName:  "",
          email:     "",
          university: "",
          source:    "physical" as const,
        }));

        const { applications } = await fetchApplicationsForLeads(leadInputs);
        expaStatusByEpId = new Map(applications.map((a) => [a.epId, a.status]));
      }
    } catch (err) {
      // Non-fatal — conversion rates will show 0 if EXPA is unavailable
      console.warn("[api/ranking] EXPA lookup failed (non-fatal):", err);
    }

    // 4. Compute per-member stats
    const stats: MemberStat[] = [];

    for (const [name, data] of memberLeads.entries()) {
      let applied  = 0;
      let realized = 0;

      for (const epId of data.expaIds) {
        const status = expaStatusByEpId.get(epId);
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

    // Sort by totalLeads desc by default
    stats.sort((a, b) => b.totalLeads - a.totalLeads || a.name.localeCompare(b.name));

    return NextResponse.json({
      success:       true,
      members:       stats,
      totalMembers:  stats.length,
      totalLeads:    stats.reduce((s, m) => s + m.totalLeads,  0),
      todayLeads:    stats.reduce((s, m) => s + m.todayLeads,  0),
      totalApplied:  stats.reduce((s, m) => s + m.applied,     0),
      totalRealized: stats.reduce((s, m) => s + m.realized,    0),
      generatedAt:   new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to compute rankings.";
    console.error("[api/ranking] error:", error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
