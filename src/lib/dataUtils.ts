/**
 * dataUtils.ts — single data-access layer for all static JSON data.
 *
 * Sections:
 *  1. Types
 *  2. Raw data accessors
 *  3. Date helpers
 *  4. Series aggregators (for charts)
 *  5. Dashboard KPI helpers
 *  6. University / Opportunity helpers
 */

import DigitalLeadsRaw     from "@/data/digitalLeads.json";
import physicalRaw         from "@/data/physicalAttraction.json";
import universitiesRaw     from "@/data/universities.json";
import opportunitiesRaw    from "@/data/opportunities.json";

// ─── 1. Types ─────────────────────────────────────────────────────────────────

export interface Lead {
  expaId:        string;
  submissionId:  string;
  submittedAt:   string;
  firstName:     string;
  lastName:      string;
  phone:         string;
  email:         string;
  university:    string;
  internshipType: string;
  referral:      string;
  volunteering:  boolean;
  professional:  boolean;
  teaching:      boolean;
  accountStatus: string;
}

export interface PhysicalAttractionLead {
  expaId:           string;
  submissionId:     string;
  submittedAt:      string;
  firstName:        string;
  lastName:         string;
  phone:            string;
  email:            string;
  university:       string;
  universityLevel:  string;
  fieldOfStudy:     string;
  internshipType:   string;
  referral:         string;
  memberName:       string;
  hackathonInterest: string;
  accountStatus:    string;
}

export interface University {
  id:          string;
  name:        string;
  logo:        string;
  country:     string;
  location:    string;
  generalInfo: string;
  salesSpeech: string;
}

export interface Opportunity {
  id:           string;
  universityId: string;
  title:        string;
  duration:     string;
  date:         string;
  country:      string;
  benefits:     string[];
  requirements: string[];
}

// ─── 2. Raw data accessors ────────────────────────────────────────────────────

export const getDigitalLeads          = (): Lead[]                   => DigitalLeadsRaw  as Lead[];
export const getPhysicalAttractionLeads = (): PhysicalAttractionLead[] => physicalRaw   as PhysicalAttractionLead[];
export const getUniversities          = (): University[]             => universitiesRaw  as University[];
export const getOpportunities         = (): Opportunity[]            => opportunitiesRaw as Opportunity[];

// ─── 3. Date helpers ──────────────────────────────────────────────────────────

function toMonthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function toWeekKey(dateStr: string) {
  const d = new Date(dateStr);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((d.getTime() - startOfYear.getTime()) / 86_400_000 + startOfYear.getDay() + 1) / 7
  );
  return `W${String(week).padStart(2, "0")} ${d.getFullYear()}`;
}

function toDayKey(dateStr: string) {
  return new Date(dateStr).toISOString().slice(0, 10);
}

function aggregateByKey(
  leads: { submittedAt: string }[],
  keyFn: (d: string) => string
): { label: string; count: number }[] {
  const map: Record<string, number> = {};
  for (const l of leads) {
    const k = keyFn(l.submittedAt);
    map[k] = (map[k] ?? 0) + 1;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, count]) => ({ label, count }));
}

// ─── 4. Chart series aggregators ─────────────────────────────────────────────

type SeriesResult = { categories: string[]; Digital: number[]; physical: number[] };

function buildSeries(keyFn: (d: string) => string, sliceLast?: number): SeriesResult {
  const digital  = aggregateByKey(getDigitalLeads(),          keyFn);
  const physical = aggregateByKey(getPhysicalAttractionLeads(), keyFn);

  const allKeys = [
    ...new Set([...digital.map((x) => x.label), ...physical.map((x) => x.label)]),
  ].sort();

  const keys = sliceLast ? allKeys.slice(-sliceLast) : allKeys;
  const dMap = Object.fromEntries(digital.map((x) => [x.label, x.count]));
  const pMap = Object.fromEntries(physical.map((x) => [x.label, x.count]));

  return {
    categories: keys,
    Digital:    keys.map((k) => dMap[k] ?? 0),
    physical:   keys.map((k) => pMap[k] ?? 0),
  };
}

export const getLeadSeriesMonthly = (): SeriesResult => buildSeries(toMonthKey);
export const getLeadSeriesWeekly  = (): SeriesResult => buildSeries(toWeekKey,  12);
export const getLeadSeriesDaily   = (): SeriesResult => buildSeries(toDayKey,   30);

// ─── 5. Dashboard KPI helpers ─────────────────────────────────────────────────

export function getDashboardStats() {
  const digital  = getDigitalLeads();
  const physical = getPhysicalAttractionLeads();

  const now          = new Date();
  const startOfWeek  = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    totalLeads:        digital.length,
    successfulAccounts: digital.filter((l) => l.accountStatus.includes("✅")).length,
    existingAccounts:  digital.filter((l) => l.accountStatus.includes("⚠️")).length,
    totalUniversities: new Set(digital.map((l) => l.university)).size,
    volunteeringCount: digital.filter((l) => l.volunteering).length,
    professionalCount: digital.filter((l) => l.professional).length,
    teachingCount:     digital.filter((l) => l.teaching).length,
    leadsThisWeek:     digital.filter((l) => new Date(l.submittedAt) >= startOfWeek).length,
    leadsThisMonth:    digital.filter((l) => new Date(l.submittedAt) >= startOfMonth).length,
    totalPhysicalLeads: physical.length,
    recentLeads:       digital.slice(-10).reverse(),
    leadsByMonth:      Object.fromEntries(
      aggregateByKey(digital, (d) => {
        const dt = new Date(d);
        return dt.toLocaleString("default", { month: "short", year: "2-digit" });
      }).map(({ label, count }) => [label, count])
    ),
    referralSources: Object.fromEntries(
      digital.reduce((acc, l) => {
        acc.set(l.referral, (acc.get(l.referral) ?? 0) + 1);
        return acc;
      }, new Map<string, number>())
    ),
  };
}

export function getTopUniversities(n = 10) {
  const map = new Map<string, { Digital: number; physical: number }>();

  for (const l of getDigitalLeads()) {
    const u = l.university || "Unknown";
    const e = map.get(u) ?? { Digital: 0, physical: 0 };
    map.set(u, { ...e, Digital: e.Digital + 1 });
  }
  for (const l of getPhysicalAttractionLeads()) {
    const u = l.university || "Unknown";
    const e = map.get(u) ?? { Digital: 0, physical: 0 };
    map.set(u, { ...e, physical: e.physical + 1 });
  }

  return [...map.entries()]
    .map(([name, counts]) => ({
      name,
      shortName: name.includes(":") ? name.split(":")[0].trim() : name,
      total:     counts.Digital + counts.physical,
      ...counts,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
}

export function getUniversityStats() {
  const map = new Map<string, {
    name: string; totalLeads: number;
    volunteering: number; professional: number; teaching: number;
    successfulAccounts: number;
  }>();

  const ensure = (name: string) => {
    if (!map.has(name)) {
      map.set(name, { name, totalLeads: 0, volunteering: 0, professional: 0, teaching: 0, successfulAccounts: 0 });
    }
    return map.get(name)!;
  };

  for (const l of getDigitalLeads()) {
    const e = ensure(l.university);
    e.totalLeads++;
    if (l.volunteering)                     e.volunteering++;
    if (l.professional)                     e.professional++;
    if (l.teaching)                         e.teaching++;
    if (l.accountStatus.includes("✅"))     e.successfulAccounts++;
  }
  for (const l of getPhysicalAttractionLeads()) {
    const e = ensure(l.university);
    e.totalLeads++;
    if (l.accountStatus.includes("✅"))     e.successfulAccounts++;
  }

  return [...map.values()].sort((a, b) => b.totalLeads - a.totalLeads);
}

// ─── 6. University / Opportunity helpers ──────────────────────────────────────

export function getUniversityById(id: string): University | undefined {
  return getUniversities().find((u) => u.id === id);
}

export function getOpportunitiesByUniversityId(universityId: string): Opportunity[] {
  // Admin may persist updated opportunities in localStorage
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("opportunities");
    if (stored) {
      return (JSON.parse(stored) as Opportunity[]).filter((o) => o.universityId === universityId);
    }
  }
  return getOpportunities().filter((o) => o.universityId === universityId);
}

export function getOpportunityById(id: string): Opportunity | undefined {
  return getOpportunities().find((o) => o.id === id);
}
