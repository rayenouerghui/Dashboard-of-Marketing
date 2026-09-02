import physicalRaw from "./physicalConversionSignups.json";
import digitalRaw from "./digitalConversionSignups.json";
import pipelineRaw from "./applicationPipeline.json";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ApprovalStatus = "Yes" | "No" | "No application found" | string;

export interface ConversionSignup {
  expaId: string;
  submissionId: string;
  submittedAt: string;
  firstName: string;
  lastName: string;
  email: string;
  university: string;
  referral: string;
  accountStatus: string;
  applied?: string;
  approved?: ApprovalStatus;
}

export interface PhysicalConversionSignup extends ConversionSignup {
  memberName: string;
}

export interface RankingEntry {
  name: string;
  approvals: number;
  totalSignups: number;
  applications: number;
  conversionRate: number;
  applicationRate: number;
  approvalRate: number;
}

export interface ConversionStats {
  total: number;
  approved: number;
  applied: number;
  rejected: number;
  noApplication: number;
  conversionRate: number;
  applicationRate: number;
}

// ─── Static data ─────────────────────────────────────────────────────────────

export const physicalSignups: PhysicalConversionSignup[] =
  physicalRaw as PhysicalConversionSignup[];

export const digitalSignups: ConversionSignup[] = digitalRaw as ConversionSignup[];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isApproved(accountStatus: string): boolean {
  if (!accountStatus) return false;
  const status = accountStatus.toLowerCase();
  return status.includes("created") || status.includes("✅");
}

export function isApplied(applied: string): boolean {
  return applied?.trim().toLowerCase() === "yes";
}

export function getConversionStats(signups: { accountStatus: string; applied?: string }[]): ConversionStats {
  let approved = 0;
  let applied = 0;
  let rejected = 0;
  let noApplication = 0;

  for (const s of signups) {
    if (isApproved(s.accountStatus)) approved++;
    else rejected++;
    if (isApplied(s.applied ?? "")) applied++;
  }

  const total = signups.length;
  const conversionRate = total > 0 ? (approved / total) * 100 : 0;
  const applicationRate = total > 0 ? (applied / total) * 100 : 0;

  return { total, approved, applied, rejected, noApplication, conversionRate, applicationRate };
}

export function getGlobalConversionStats(): ConversionStats {
  return getConversionStats([...physicalSignups, ...digitalSignups]);
}

export function getPhysicalConversionStats(): ConversionStats {
  return getConversionStats(physicalSignups);
}

export function getDigitalConversionStats(): ConversionStats {
  return getConversionStats(digitalSignups);
}

/** Physical: rank by 🙋 Member Name */
export function getPhysicalMemberRankings(limit?: number): RankingEntry[] {
  const map = new Map<string, { approvals: number; total: number; applications: number }>();

  for (const s of physicalSignups) {
    const name = s.memberName?.trim() || "Unassigned";
    const entry = map.get(name) ?? { approvals: 0, total: 0, applications: 0 };
    entry.total++;
    if (isApproved(s.accountStatus)) entry.approvals++;
    if (isApplied(s.applied ?? "")) entry.applications++;
    map.set(name, entry);
  }

  return [...map.entries()]
    .map(([name, { approvals, total, applications }]) => ({
      name,
      approvals,
      totalSignups: total,
      applications,
      conversionRate: total > 0 ? (approvals / total) * 100 : 0,
      applicationRate: total > 0 ? (applications / total) * 100 : 0,
      approvalRate: applications > 0 ? (approvals / applications) * 100 : 0,
    }))
    .sort((a, b) => b.applications - a.applications || b.totalSignups - a.totalSignups)
    .slice(0, limit);
}

/** Digital: rank by 📢 Referral */
export function getDigitalReferralRankings(limit?: number): RankingEntry[] {
  const map = new Map<string, { approvals: number; total: number; applications: number }>();

  for (const s of digitalSignups) {
    const name = s.referral.trim() || "Unknown";
    const entry = map.get(name) ?? { approvals: 0, total: 0, applications: 0 };
    entry.total++;
    if (isApproved(s.accountStatus)) entry.approvals++;
    if (isApplied(s.applied ?? "")) entry.applications++;
    map.set(name, entry);
  }

  return [...map.entries()]
    .map(([name, { approvals, total, applications }]) => ({
      name,
      approvals,
      totalSignups: total,
      applications,
      conversionRate: total > 0 ? (approvals / total) * 100 : 0,
      applicationRate: total > 0 ? (applications / total) * 100 : 0,
      approvalRate: applications > 0 ? (approvals / applications) * 100 : 0,
    }))
    .sort((a, b) => b.approvals - a.approvals || b.totalSignups - a.totalSignups)
    .slice(0, limit);
}

/** University stats for physical attraction */
export function getPhysicalUniversityStats() {
  const map = new Map<string, { total: number; created: number; applications: number; approvals: number }>();

  for (const s of physicalSignups) {
    const u = s.university.trim() || "Unknown";
    const entry = map.get(u) ?? { total: 0, created: 0, applications: 0, approvals: 0 };
    entry.total++;
    if (isApplied(s.applied ?? "")) entry.applications++;
    if (isApproved(s.accountStatus)) entry.approvals++;
    map.set(u, entry);
  }

  return [...map.entries()]
    .map(([name, { total, created, applications, approvals }]) => ({
      name,
      shortName: name.includes(":") ? name.split(":")[0].trim() : name,
      total,
      applications,
      approvals,
      applicationRate: total > 0 ? (applications / total) * 100 : 0,
      approvalRate: total > 0 ? (approvals / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/** University stats for digital leads */
export function getDigitalUniversityStats() {
  const map = new Map<string, { total: number; applications: number; approvals: number }>();

  for (const s of digitalSignups) {
    const u = s.university.trim() || "Unknown";
    const entry = map.get(u) ?? { total: 0, applications: 0, approvals: 0 };
    entry.total++;
    if (isApplied(s.applied ?? "")) entry.applications++;
    if (isApproved(s.accountStatus)) entry.approvals++;
    map.set(u, entry);
  }

  return [...map.entries()]
    .map(([name, { total, applications, approvals }]) => ({
      name,
      shortName: name.includes(":") ? name.split(":")[0].trim() : name,
      total,
      applications,
      approvals,
      applicationRate: total > 0 ? (applications / total) * 100 : 0,
      approvalRate: total > 0 ? (approvals / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/** All physical members (for ranking page) */
export function getAllPhysicalMembers(): RankingEntry[] {
  return getPhysicalMemberRankings();
}

/** Home dashboard: top performers across physical members + digital referrals. */
export function getGlobalApprovalRankings(limit = 10): (RankingEntry & { channel: "Physical" | "Digital" })[] {
  const physical = getPhysicalMemberRankings().map((r) => ({ ...r, channel: "Physical" as const }));
  const digital = getDigitalReferralRankings().map((r) => ({ ...r, channel: "Digital" as const }));

  return [...physical, ...digital]
    .filter((r) => r.applications > 0 || r.approvals > 0)
    .sort((a, b) => b.applications - a.applications || b.totalSignups - a.totalSignups)
    .slice(0, limit);
}

export function formatRate(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

export function formatConversionRate(rate: number): string {
  return `${rate.toFixed(2)}%`;
}

// ─── Application Pipeline (EXPA CSV) ─────────────────────────────────────────

export interface ApplicationRecord {
  applicationId: string;
  status: string;
  createdAt: string;
  epId: string;
  epName: string;
  programme: string;
  opportunityId: string;
  opportunityTitle: string;
}

export type PipelineStatus =
  | "open"
  | "approved"
  | "approved_ep_manager"
  | "accepted"
  | "matched"
  | "realized"
  | "completed"
  | "finished"
  | "rejected"
  | "withdrawn"
  | "broken"
  | "approval_broken"
  | "realization_broken"
  | "other";

export interface PipelineStats {
  total: number;
  uniqueEPs: number;       // unique EPs (count by epId)
  open: number;
  approved: number;         // approved + approved_ep_manager + accepted
  matched: number;
  realized: number;         // realized + completed + finished
  rejected: number;
  withdrawn: number;
  broken: number;           // approval_broken + realization_broken
  approvalRate: number;     // approved / total leads
  realizationRate: number;  // realized / total leads
  dropRate: number;         // (rejected + withdrawn) / total
  totalLeads: number;       // total leads from conversion signups
}

export interface PipelineByProgramme {
  programme: string;
  total: number;
  uniqueEPs: number;      // unique EPs for this programme
  open: number;
  approved: number;
  realized: number;
  rejected: number;
  withdrawn: number;
  approvalRate: number;
  realizationRate: number;
  conversionRate: number;  // unique EPs / total leads
}

export const applicationPipeline: ApplicationRecord[] =
  pipelineRaw as ApplicationRecord[];

/** Normalize a raw status string into a PipelineStatus bucket */
function bucketStatus(status: string): PipelineStatus {
  const s = status.toLowerCase().trim();
  if (s === "open") return "open";
  if (s === "approved" || s === "approved_ep_manager" || s === "accepted") return "approved";
  if (s === "matched") return "matched";
  if (s === "realized" || s === "completed" || s === "finished") return "realized";
  if (s === "rejected") return "rejected";
  if (s === "withdrawn") return "withdrawn";
  if (s === "approval_broken" || s === "realization_broken") return "broken";
  return "other";
}

export function getPipelineStats(records: ApplicationRecord[] = applicationPipeline): PipelineStats {
  let open = 0, approved = 0, matched = 0, realized = 0;
  let rejected = 0, withdrawn = 0, broken = 0;
  
  // Count unique EPs by epId
  const uniqueEPSet = new Set<string>();
  const epStatusMap = new Map<string, PipelineStatus>();

  for (const r of records) {
    const b = bucketStatus(r.status);
    if (b === "open") open++;
    else if (b === "approved") approved++;
    else if (b === "matched") matched++;
    else if (b === "realized") realized++;
    else if (b === "rejected") rejected++;
    else if (b === "withdrawn") withdrawn++;
    else if (b === "broken") broken++;
    
    // Track unique EPs and their latest status
    uniqueEPSet.add(r.epId);
    epStatusMap.set(r.epId, b);
  }

  const total = records.length;
  const uniqueEPs = uniqueEPSet.size;
  const totalLeads = physicalSignups.length + digitalSignups.length;
  
  return {
    total,
    uniqueEPs,
    open,
    approved,
    matched,
    realized,
    rejected,
    withdrawn,
    broken,
    approvalRate: totalLeads > 0 ? (approved / totalLeads) * 100 : 0,
    realizationRate: totalLeads > 0 ? (realized / totalLeads) * 100 : 0,
    dropRate: total > 0 ? ((rejected + withdrawn) / total) * 100 : 0,
    totalLeads,
  };
}

export function getPipelineByProgramme(): PipelineByProgramme[] {
  const map = new Map<string, { total: number; uniqueEPs: Set<string>; open: number; approved: number; realized: number; rejected: number; withdrawn: number }>();
  const totalLeads = physicalSignups.length + digitalSignups.length;

  for (const r of applicationPipeline) {
    const prog = r.programme || "Unknown";
    const entry = map.get(prog) ?? { total: 0, uniqueEPs: new Set<string>(), open: 0, approved: 0, realized: 0, rejected: 0, withdrawn: 0 };
    entry.total++;
    entry.uniqueEPs.add(r.epId);
    const b = bucketStatus(r.status);
    if (b === "open") entry.open++;
    else if (b === "approved") entry.approved++;
    else if (b === "realized") entry.realized++;
    else if (b === "rejected") entry.rejected++;
    else if (b === "withdrawn") entry.withdrawn++;
    map.set(prog, entry);
  }

  return [...map.entries()]
    .map(([programme, e]) => ({
      programme,
      total: e.total,
      uniqueEPs: e.uniqueEPs.size,
      open: e.open,
      approved: e.approved,
      realized: e.realized,
      rejected: e.rejected,
      withdrawn: e.withdrawn,
      approvalRate: e.total > 0 ? (e.approved / e.total) * 100 : 0,
      realizationRate: e.total > 0 ? (e.realized / e.total) * 100 : 0,
      conversionRate: totalLeads > 0 ? (e.uniqueEPs.size / totalLeads) * 100 : 0,
    }))
    .sort((a, b) => b.uniqueEPs - a.uniqueEPs);
}

/** Top EPs by total applications in the pipeline */
export function getTopEPsByApplications(limit = 10) {
  const map = new Map<string, { name: string; total: number; approved: number; realized: number }>();

  for (const r of applicationPipeline) {
    const key = r.epId;
    const entry = map.get(key) ?? { name: r.epName, total: 0, approved: 0, realized: 0 };
    entry.total++;
    const b = bucketStatus(r.status);
    if (b === "approved") entry.approved++;
    else if (b === "realized") entry.realized++;
    map.set(key, entry);
  }

  return [...map.entries()]
    .map(([epId, e]) => ({ epId, ...e }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

/** Monthly application volume */
export function getPipelineByMonth(): { month: string; total: number; approved: number; uniqueApplicants: number }[] {
  const map = new Map<string, { total: number; approved: number; uniqueEPs: Set<string> }>();

  for (const r of applicationPipeline) {
    const d = new Date(r.createdAt);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = map.get(key) ?? { total: 0, approved: 0, uniqueEPs: new Set<string>() };
    entry.total++;
    entry.uniqueEPs.add(r.epId);
    const b = bucketStatus(r.status);
    if (b === "approved") entry.approved++;
    map.set(key, entry);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, e]) => ({ month, total: e.total, approved: e.approved, uniqueApplicants: e.uniqueEPs.size }));
}
