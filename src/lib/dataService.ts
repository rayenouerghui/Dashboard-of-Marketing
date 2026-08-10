import physicalAttractionRaw from "@/data/physicalAttraction.json";
import DigitalLeadsRaw from "@/data/digitalLeads.json";

export interface PhysicalLead {
  expaId: string;
  submissionId: string;
  submittedAt: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  university: string;
  universityLevel: string;
  fieldOfStudy: string;
  internshipType: string;
  referral: string;
  memberName: string;
  hackathonInterest: string;
  accountStatus: string;
}

export interface DigitalLead {
  expaId: string;
  submissionId: string;
  submittedAt: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  university: string;
  fieldOfStudy: string;
  yearOfStudy: string;
  internshipType: string;
  referral: string;
  volunteering: boolean;
  professional: boolean;
  teaching: boolean;
  accountStatus: string;
}

export const physicalLeads: PhysicalLead[] = physicalAttractionRaw as PhysicalLead[];
export const DigitalLeads: DigitalLead[] = DigitalLeadsRaw as DigitalLead[];

// --- Aggregation helpers ---

export function getAccountStatusCounts(leads: { accountStatus: string }[]) {
  let created = 0, exists = 0, other = 0;
  for (const l of leads) {
    if (l.accountStatus.includes("created successfully")) created++;
    else if (l.accountStatus.includes("already exists")) exists++;
    else other++;
  }
  return { created, exists, other };
}

export function getUniversityCounts(leads: { university: string }[]) {
  const map: Record<string, number> = {};
  for (const l of leads) {
    const u = l.university || "Unknown";
    map[u] = (map[u] || 0) + 1;
  }
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function getReferralCounts(leads: { referral: string }[]) {
  const map: Record<string, number> = {};
  for (const l of leads) {
    const r = l.referral || "Unknown";
    map[r] = (map[r] || 0) + 1;
  }
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function getInternshipTypeCounts(leads: { internshipType: string }[]) {
  const map: Record<string, number> = {};
  for (const l of leads) {
    const types = l.internshipType.split(",").map((t) => t.trim()).filter(Boolean);
    for (const t of types) {
      map[t] = (map[t] || 0) + 1;
    }
  }
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function getWeeklySubmissions(leads: { submittedAt: string }[]) {
  const map: Record<string, number> = {};
  for (const l of leads) {
    const date = l.submittedAt?.slice(0, 10);
    if (date) map[date] = (map[date] || 0) + 1;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}
