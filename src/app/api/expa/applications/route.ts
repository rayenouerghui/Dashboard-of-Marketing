import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchApplicationsForLeads, type LeadInput } from "@/lib/server/expaApplicationsClient";
import { fetchDigitalLeadsRaw, fetchPhysicalLeadsRaw } from "@/lib/googleSheetsServer";

export const dynamic = "force-dynamic";

// ─── Lead mappers ─────────────────────────────────────────────────────────────

const CUTOFF = new Date("2026-02-01T00:00:00Z");

function isAfterCutoff(dateStr: string): boolean {
  if (!dateStr) return false;
  try { return new Date(dateStr) >= CUTOFF; } catch { return false; }
}

function mapDigitalLead(r: Record<string, string>): LeadInput | null {
  const expaId    = (r["EXPA ID"] || r.expaId || r.eXPAID || "").trim();
  const submittedAt = r["Submitted at"] || r.submittedAt || r.submitted_at || "";
  if (!isAfterCutoff(submittedAt)) return null;

  return {
    expaId,
    firstName:  r["[FN] First Name"] || r.firstName || r.first_name || "",
    lastName:   r["[LN] Last Name"]  || r.lastName  || r.last_name  || "",
    email:      r["[E] Email"]       || r.email     || "",
    university: r["[UN] University Name"] || r.university || "",
    source:     "digital",
  };
}

function mapPhysicalLead(r: Record<string, string>): LeadInput | null {
  const expaId    = (r["EXPA ID"] || r.expaId || r.eXPAID || "").trim();
  const submittedAt = r["Submitted at"] || r.submittedAt || r.submitted_at || "";
  if (!isAfterCutoff(submittedAt)) return null;

  return {
    expaId,
    firstName:  r["[FN] First Name"] || r.firstName || r.first_name || "",
    lastName:   r["[LN] Last Name"]  || r.lastName  || r.last_name  || "",
    email:      r["[E] Email"]       || r.email     || "",
    university: r["[UN] University Name"] || r.university || "",
    memberName: r["🙋Member Name"]   || r.memberName || "",
    source:     "physical",
  };
}

// ─── Cached fetch ─────────────────────────────────────────────────────────────
// 15-minute cache — status changes on EXPA aren't instant anyway
const getCached = unstable_cache(
  async () => {
    const [digitalRaw, physicalRaw] = await Promise.all([
      fetchDigitalLeadsRaw(),
      fetchPhysicalLeadsRaw(),
    ]);

    const leads: LeadInput[] = [];
    for (const r of digitalRaw) {
      const l = mapDigitalLead(r);
      if (l) leads.push(l);
    }
    for (const r of physicalRaw) {
      const l = mapPhysicalLead(r);
      if (l) leads.push(l);
    }

    const result = await fetchApplicationsForLeads(leads);
    return {
      ...result,
      totalLeads: leads.length,
      fetchedAt:  new Date().toISOString(),
    };
  },
  ["expa-applications-from-leads"],
  { revalidate: 900 } // 15 min
);

export async function GET(request: Request) {
  const nocache = new URL(request.url).searchParams.get("nocache") === "1";

  try {
    const data = nocache
      ? await (async () => {
          const [digitalRaw, physicalRaw] = await Promise.all([
            fetchDigitalLeadsRaw(),
            fetchPhysicalLeadsRaw(),
          ]);
          const leads: LeadInput[] = [];
          for (const r of digitalRaw)  { const l = mapDigitalLead(r);  if (l) leads.push(l); }
          for (const r of physicalRaw) { const l = mapPhysicalLead(r); if (l) leads.push(l); }
          const result = await fetchApplicationsForLeads(leads);
          return { ...result, totalLeads: leads.length, fetchedAt: new Date().toISOString() };
        })()
      : await getCached();

    return NextResponse.json({ success: true, ...data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch EP statuses.";
    console.error("[api/expa/applications] error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
