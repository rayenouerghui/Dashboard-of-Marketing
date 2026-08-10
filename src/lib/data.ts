// Central data access — imports static JSON files
import DigitalLeadsRaw from "@/data/digitalLeads.json";
import physicalAttractionRaw from "@/data/physicalAttraction.json";

export interface DigitalLead {
  expaId: string;
  submissionId: string;
  submittedAt: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  university: string;
  internshipType: string;
  referral: string;
  volunteering: boolean;
  professional: boolean;
  teaching: boolean;
  accountStatus: string;
}

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
  internshipType: string;
  referral: string;
  memberName: string;
  hackathonInterest: string;
  accountStatus: string;
}

export const DigitalLeads: DigitalLead[] = DigitalLeadsRaw as DigitalLead[];
export const physicalLeads: PhysicalLead[] = physicalAttractionRaw as PhysicalLead[];

// Derived stats helpers
export function getUniqueUniversities(leads: Array<{ university: string }>) {
  return [...new Set(leads.map((l) => l.university).filter(Boolean))].sort();
}

export function getReferralCounts(leads: Array<{ referral: string }>) {
  const counts: Record<string, number> = {};
  leads.forEach((l) => {
    const key = l.referral || "Other";
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

export function getUniversityCounts(leads: Array<{ university: string }>) {
  const counts: Record<string, number> = {};
  leads.forEach((l) => {
    const key = l.university || "Unknown";
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

export function getAccountStatusCounts(leads: Array<{ accountStatus: string }>) {
  const created = leads.filter((l) => l.accountStatus.includes("created successfully")).length;
  const existing = leads.filter((l) => l.accountStatus.includes("already exists")).length;
  return { created, existing };
}

export function getLeadsByMonth(leads: Array<{ submittedAt: string }>) {
  const counts: Record<string, number> = {};
  leads.forEach((l) => {
    const date = new Date(l.submittedAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({ month, count }));
}
