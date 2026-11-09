import "server-only";
import { unstable_cache } from "next/cache";
import { fetchApplicationsForLeads, type FetchResult, type LeadInput } from "./expaApplicationsClient";
import { fetchDigitalLeadsRaw, fetchPhysicalLeadsRaw, resolveMemberNameValue } from "@/lib/googleSheetsServer";

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
    memberName: resolveMemberNameValue(r),
    source:     "physical",
  };
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export type ApplicationsFromSheets = FetchResult & {
  totalLeads: number;
  fetchedAt:  string;
};

async function loadApplicationsFromSheets(): Promise<ApplicationsFromSheets> {
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
  return { ...result, totalLeads: leads.length, fetchedAt: new Date().toISOString() };
}

// Shared 6-hour cache — the admin dashboard reads this every time it loads, but
// the underlying sheet reads + EXPA person lookups only re-run once per window.
const getCached = unstable_cache(
  loadApplicationsFromSheets,
  ["expa-applications-from-leads"],
  { revalidate: 21600 } // 6 h
);

export function getApplicationsFromSheets(nocache = false): Promise<ApplicationsFromSheets> {
  // `?nocache=1` bypasses the cache for an on-demand refresh.
  return nocache ? loadApplicationsFromSheets() : getCached();
}
