import DigitalLeadsRaw from '@/data/digitalLeads.json';
import physicalAttractionRaw from '@/data/physicalAttraction.json';
import universitiesRaw from '@/data/universities.json';
import opportunitiesRaw from '@/data/opportunities.json';

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface Lead {
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

export interface PhysicalAttractionLead {
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

export interface University {
  id: string;
  name: string;
  logo: string;
  country: string;
  location: string;
  generalInfo: string;
  salesSpeech: string;
}

export interface Opportunity {
  id: string;
  universityId: string;
  title: string;
  duration: string;
  date: string;
  country: string;
  benefits: string[];
  requirements: string[];
}

// ─── Raw Data ──────────────────────────────────────────────────────────────────

export const getDigitalLeads = (): Lead[] => DigitalLeadsRaw as Lead[];
export const getPhysicalAttractionLeads = (): PhysicalAttractionLead[] =>
  physicalAttractionRaw as PhysicalAttractionLead[];

// ─── Universities & Opportunities Data ──────────────────────────────────────────

export const getUniversities = (): University[] => universitiesRaw as University[];
export const getOpportunities = (): Opportunity[] => opportunitiesRaw as Opportunity[];

export const getUniversityById = (id: string): University | undefined => {
  const universities = getUniversities();
  return universities.find((uni) => uni.id === id);
};

export const getOpportunitiesByUniversityId = (universityId: string): Opportunity[] => {
  // First check localStorage for admin-updated opportunities
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("opportunities");
    if (stored) {
      const opportunities = JSON.parse(stored) as Opportunity[];
      return opportunities.filter((opp) => opp.universityId === universityId);
    }
  }
  // Fallback to static data
  const opportunities = getOpportunities();
  return opportunities.filter((opp) => opp.universityId === universityId);
};

export const getOpportunityById = (id: string): Opportunity | undefined => {
  const opportunities = getOpportunities();
  return opportunities.find((opp) => opp.id === id);
};

// ─── Date helpers ──────────────────────────────────────────────────────────────

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `W${String(week).padStart(2, '0')} ${d.getFullYear()}`;
}

function getDayKey(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10);
}

function aggregateByKey(leads: { submittedAt: string }[], keyFn: (d: string) => string) {
  const map: Record<string, number> = {};
  for (const l of leads) {
    const k = keyFn(l.submittedAt);
    map[k] = (map[k] || 0) + 1;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, count]) => ({ label, count }));
}

// ─── Aggregated Series (Digital + Physical, by period) ────────────────────────────

export function getLeadSeriesMonthly() {
  const Digital = aggregateByKey(getDigitalLeads(), getMonthKey);
  const phys = aggregateByKey(getPhysicalAttractionLeads(), getMonthKey);

  // Merge keys from both
  const allKeys = [...new Set([...Digital.map(x => x.label), ...phys.map(x => x.label)])].sort();
  const DigitalMap = Object.fromEntries(Digital.map(x => [x.label, x.count]));
  const physMap = Object.fromEntries(phys.map(x => [x.label, x.count]));

  return {
    categories: allKeys,
    Digital: allKeys.map(k => DigitalMap[k] || 0),
    physical: allKeys.map(k => physMap[k] || 0),
  };
}

export function getLeadSeriesWeekly() {
  // Use only the last 12 weeks of data from each dataset
  const Digital = aggregateByKey(getDigitalLeads(), getWeekKey);
  const phys = aggregateByKey(getPhysicalAttractionLeads(), getWeekKey);

  const allKeys = [...new Set([...Digital.map(x => x.label), ...phys.map(x => x.label)])].sort();
  const recent = allKeys.slice(-12); // last 12 weeks
  const DigitalMap = Object.fromEntries(Digital.map(x => [x.label, x.count]));
  const physMap = Object.fromEntries(phys.map(x => [x.label, x.count]));

  return {
    categories: recent,
    Digital: recent.map(k => DigitalMap[k] || 0),
    physical: recent.map(k => physMap[k] || 0),
  };
}

export function getLeadSeriesDaily() {
  // Use only the last 30 days of data from each dataset
  const Digital = aggregateByKey(getDigitalLeads(), getDayKey);
  const phys = aggregateByKey(getPhysicalAttractionLeads(), getDayKey);

  const allKeys = [...new Set([...Digital.map(x => x.label), ...phys.map(x => x.label)])].sort();
  const recent = allKeys.slice(-30); // last 30 days with activity
  const DigitalMap = Object.fromEntries(Digital.map(x => [x.label, x.count]));
  const physMap = Object.fromEntries(phys.map(x => [x.label, x.count]));

  return {
    categories: recent,
    Digital: recent.map(k => DigitalMap[k] || 0),
    physical: recent.map(k => physMap[k] || 0),
  };
}

// ─── Main Dashboard Stats ──────────────────────────────────────────────────────

export const getDashboardStats = () => {
  const leads = getDigitalLeads();
  const physicalLeads = getPhysicalAttractionLeads();

  const totalLeads = leads.length;
  const successfulAccounts = leads.filter(l => l.accountStatus.includes('✅')).length;
  const existingAccounts = leads.filter(l => l.accountStatus.includes('⚠️')).length;

  const universities = [...new Set(leads.map(l => l.university))];
  const totalUniversities = universities.length;

  const volunteeringCount = leads.filter(l => l.volunteering).length;
  const professionalCount = leads.filter(l => l.professional).length;
  const teachingCount = leads.filter(l => l.teaching).length;

  const referralSources = leads.reduce((acc, lead) => {
    acc[lead.referral] = (acc[lead.referral] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const leadsByMonth = leads.reduce((acc, lead) => {
    const date = new Date(lead.submittedAt);
    const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
    acc[monthKey] = (acc[monthKey] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Current week leads
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const leadsThisWeek = leads.filter(l => new Date(l.submittedAt) >= startOfWeek).length;

  // Current month leads
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const leadsThisMonth = leads.filter(l => new Date(l.submittedAt) >= startOfMonth).length;

  // Total physical leads stats
  const totalPhysicalLeads = physicalLeads.length;

  return {
    totalLeads,
    successfulAccounts,
    existingAccounts,
    totalUniversities,
    volunteeringCount,
    professionalCount,
    teachingCount,
    referralSources,
    leadsByMonth,
    recentLeads: leads.slice(-10).reverse(),
    leadsThisWeek,
    leadsThisMonth,
    totalPhysicalLeads,
  };
};

// ─── University Stats ──────────────────────────────────────────────────────────

export const getUniversityStats = () => {
  const digitalLeads = getDigitalLeads();
  const physicalLeads = getPhysicalAttractionLeads();

  const universityData: Record<string, {
    name: string;
    totalLeads: number;
    volunteering: number;
    professional: number;
    teaching: number;
    successfulAccounts: number;
  }> = {};

  // Process digital leads
  digitalLeads.forEach((lead) => {
    if (!universityData[lead.university]) {
      universityData[lead.university] = {
        name: lead.university,
        totalLeads: 0,
        volunteering: 0,
        professional: 0,
        teaching: 0,
        successfulAccounts: 0,
      };
    }
    universityData[lead.university].totalLeads++;
    if (lead.volunteering) universityData[lead.university].volunteering++;
    if (lead.professional) universityData[lead.university].professional++;
    if (lead.teaching) universityData[lead.university].teaching++;
    if (lead.accountStatus.includes('✅')) universityData[lead.university].successfulAccounts++;
  });

  // Add physical leads to university data
  physicalLeads.forEach((lead) => {
    if (!universityData[lead.university]) {
      universityData[lead.university] = {
        name: lead.university,
        totalLeads: 0,
        volunteering: 0,
        professional: 0,
        teaching: 0,
        successfulAccounts: 0,
      };
    }
    universityData[lead.university].totalLeads++;
    if (lead.accountStatus.includes('Account created')) universityData[lead.university].successfulAccounts++;
  });

  return Object.values(universityData).sort((a, b) => b.totalLeads - a.totalLeads);
};

// ─── Top Universities (for chart) ─────────────────────────────────────────────

export const getTopUniversities = (n = 10) => {
  const leads = getDigitalLeads();
  const physLeads = getPhysicalAttractionLeads();

  const map: Record<string, { Digital: number; physical: number }> = {};

  for (const l of leads) {
    const u = l.university || 'Unknown';
    if (!map[u]) map[u] = { Digital: 0, physical: 0 };
    map[u].Digital++;
  }
  for (const l of physLeads) {
    const u = l.university || 'Unknown';
    if (!map[u]) map[u] = { Digital: 0, physical: 0 };
    map[u].physical++;
  }

  const sorted = Object.entries(map)
    .map(([name, counts]) => ({ name, total: counts.Digital + counts.physical, ...counts }))
    .sort((a, b) => b.total - a.total)
    .slice(0, n);

  // Shorten long university names to abbreviation if available
  return sorted.map(u => ({
    ...u,
    shortName: u.name.includes(':') ? u.name.split(':')[0].trim() : u.name,
  }));
};

// ─── Weekly Target helpers ─────────────────────────────────────────────────────

export function getWeeklyLeadCounts(): { label: string; count: number }[] {
  return aggregateByKey(getDigitalLeads(), getWeekKey);
}

export function getCurrentWeekLeads(): number {
  const now = new Date();
  const key = getWeekKey(now.toISOString());
  const all = getWeeklyLeadCounts();
  return all.find(w => w.label === key)?.count ?? 0;
}

// ─── Back-compat re-exports (so old imports don't break) ─────────────────────

export { getDigitalLeads as DigitalLeads, getPhysicalAttractionLeads as physicalLeads };
