import { NextResponse } from "next/server";
import { fetchPhysicalLeadsRaw } from "@/lib/googleSheetsServer";

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

    // 3. Fetch EXPA application statuses (already cached for 15 min)
    // We call our own cached endpoint to avoid duplicating the heavy fetch logic
    let expaStatusByEpId: Map<string, string> = new Map();
    try {
      const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const expaRes = await fetch(`${origin}/api/expa/applications`, {
        next: { revalidate: 900 }, // match the 15-min cache
      });
      if (expaRes.ok) {
        const expaData = await expaRes.json();
        const apps = (expaData.applications ?? []) as Array<{ epId: string; status: string }>;
        expaStatusByEpId = new Map(apps.map((a) => [a.epId, a.status]));
      }
    } catch {
      // Non-fatal — conversion rates will show 0 if EXPA is unavailable
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
