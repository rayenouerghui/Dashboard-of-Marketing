/**
 * dataUtilsServer.ts — server-only aggregator for Google Sheets data.
 *
 * Performance & simplicity rewrite:
 *   - One single pass per lead array (digital + physical).
 *   - Date keys are parsed with a regex (YYYY-MM-DD or "YYYY-MM-DD HH:MM:SS")
 *     instead of creating heavy Date objects — removes the single biggest
 *     GC pressure source that caused the Node process to OOM/exit on the
 *     admin dashboard.
 *   - ONE unstable_cache call computes ALL derived data at once
 *     (stats + 3 chart series + topUniversities + universityStats).
 *   - Legacy named exports (getDashboardStats / getLeadSeriesMonthly / ...)
 *     are kept for backward compatibility with other pages; they just
 *     re-read from the same cached bag.
 */

import "server-only";
import { unstable_cache } from "next/cache";
import { fetchDigitalLeadsRaw, fetchPhysicalLeadsRaw } from "./googleSheetsServer";

// ────────────────────────────────────────────────────────────────────────────
// Shared interfaces (also re-used by route files / client props)
// ────────────────────────────────────────────────────────────────────────────
export interface Lead {
  expaId:         string;
  submissionId:   string;
  submittedAt:    string;
  firstName:      string;
  lastName:       string;
  phone:          string;
  email:          string;
  university:     string;
  internshipType: string;
  referral:       string;
  volunteering:   boolean;
  professional:   boolean;
  teaching:       boolean;
  accountStatus:  string;
}

export interface PhysicalAttractionLead {
  expaId:            string;
  submissionId:      string;
  submittedAt:       string;
  firstName:         string;
  lastName:          string;
  phone:             string;
  email:             string;
  university:        string;
  universityLevel:   string;
  fieldOfStudy:      string;
  internshipType:    string;
  referral:          string;
  memberName:        string;
  hackathonInterest: string;
  accountStatus:     string;
}

export type SeriesResult = { categories: string[]; Digital: number[]; physical: number[] };

export interface DashboardStats {
  totalLeads:         number;
  successfulAccounts: number;
  existingAccounts:   number;
  totalUniversities:  number;
  volunteeringCount:  number;
  professionalCount:  number;
  teachingCount:      number;
  leadsThisWeek:      number;
  leadsThisMonth:     number;
  totalPhysicalLeads: number;
  recentLeads:        Lead[];
  leadsByMonth:       Record<string, number>;
  referralSources:    Record<string, number>;
}

export interface TopUniversityRow {
  name:       string;
  shortName:  string;
  total:      number;
  Digital:    number;
  physical:   number;
}

export interface UniversityStatsRow {
  name:               string;
  totalLeads:         number;
  volunteering:       number;
  professional:       number;
  teaching:           number;
  successfulAccounts: number;
}

export interface DashboardData {
  digital:   Lead[];
  physical:  PhysicalAttractionLead[];
  stats:     DashboardStats;
  monthly:   SeriesResult;
  weekly:    SeriesResult;
  daily:     SeriesResult;
  topUniversities:  TopUniversityRow[];
  universityStats:  UniversityStatsRow[];
}

// ────────────────────────────────────────────────────────────────────────────
// Row mapping (light, no dates parsed here)
// ────────────────────────────────────────────────────────────────────────────
function mapDigitalRow(r: Record<string, string>): Lead {
  return {
    expaId:         r.expaId || r.eXPAID || r.expa_id || r.epId || "",
    submissionId:   r.submissionId || r.submissionID || r.submission_id || r.applicationId || crypto.randomUUID(),
    submittedAt:    r.submittedAt || r.submitted_at || r.signedUpAt || r.createdAt || "",
    firstName:      r.firstName || r.fNFirstName || r.first_name || r.fullName || r.full_name || r.name || r.epName || "",
    lastName:       r.lastName || r.lNLastName || r.last_name || "",
    phone:          r.phone || r.pNPhoneNumber || r.phoneNumber || r.phone_number || "",
    email:          r.email || r.eEmail || "",
    university:     r.university || r.uNUniversityName || "",
    internshipType: r.internshipType || r.typeOfAbroadInternship || r.internship_type || r.programme || "",
    referral:       r.referral || "",
    volunteering:   /^(true|yes|1)$/i.test(r.volunteering || r['typeOfAbroadInternshipVolunteeringInternship)'] || ""),
    professional:   /^(true|yes|1)$/i.test(r.professional || r['typeOfAbroadInternshipProfessionalInternship)'] || ""),
    teaching:       /^(true|yes|1)$/i.test(r.teaching || r['typeOfAbroadInternshipTeachingInternship)'] || ""),
    accountStatus:  r.accountStatus || r.accountSatus || r.account_status || "",
  };
}

function mapPhysicalRow(r: Record<string, string>): PhysicalAttractionLead {
  return {
    expaId:            r.expaId || r.eXPAID || r.expa_id || r.epId || "",
    submissionId:      r.submissionId || r.submissionID || r.submission_id || r.applicationId || crypto.randomUUID(),
    submittedAt:       r.submittedAt || r.submitted_at || r.signedUpAt || r.createdAt || "",
    firstName:         r.firstName || r.fNFirstName || r.first_name || r.fullName || r.full_name || r.name || r.epName || "",
    lastName:          r.lastName || r.lNLastName || r.last_name || "",
    phone:             r.phone || r.pNPhoneNumber || r.phoneNumber || r.phone_number || "",
    email:             r.email || r.eEmail || "",
    university:        r.university || r.uNUniversityName || "",
    universityLevel:   r.universityLevel || r.university_level || "",
    fieldOfStudy:      r.fieldOfStudy || r.field_of_study || "",
    internshipType:    r.internshipType || r.typeOfAbroadInternship || r.internship_type || r.programme || "",
    referral:          r.referral || "",
    memberName:        r.memberName || r.member_name || "",
    hackathonInterest: r.hackathonInterest || r.areYouInterestedToAttendAHackathon || r.hackathon_interest || "",
    accountStatus:     r.accountStatus || r.accountSatus || r.account_status || "",
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Ultra-light date keying (regex — no Date objects!)
//
// Input format accepted:  "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD" or ISO.
// If a value doesn't match we fall back to "Unknown" bucket, which is
// strictly better than crashing / throwing / spawning 10k Date objects.
// ────────────────────────────────────────────────────────────────────────────
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})[ T]?/;

function weekNumber(y: number, m: number, d: number): number {
  // ISO-ish week number (simple, stable, matchable) — same formula used
  // previously but with plain integers instead of Date arithmetic.
  const jan1Dow = (Math.floor((new Date(y, 0, 1)).getTime() / 86_400_000) + 4) % 7; // 0=Sun
  const doy = Math.floor((new Date(y, m - 1, d).getTime() - new Date(y, 0, 1).getTime()) / 86_400_000) + 1;
  return Math.max(1, Math.ceil((doy + jan1Dow) / 7));
}

function dateKeys(s: string) {
  const m = DATE_RE.exec(s);
  if (!m) return { month: "Unknown", week: "Unknown", day: "Unknown", shortMonth: "Unknown", year: 0, monthNum: 0, dayNum: 0 };
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  const w = weekNumber(y, mo, d);
  const shortMonth = new Date(y, mo - 1, 1).toLocaleString("default", { month: "short", year: "2-digit" });
  return {
    month: `${y}-${m[2]}`,
    week:  `W${String(w).padStart(2, "0")} ${y}`,
    day:   `${y}-${m[2]}-${m[3]}`,
    shortMonth,
    year: y, monthNum: mo, dayNum: d,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Build a SeriesResult from two maps of key->count + a sorted ordered list.
// ────────────────────────────────────────────────────────────────────────────
function makeSeries(
  orderedKeys: string[],
  dCounts: Record<string, number>,
  pCounts: Record<string, number>
): SeriesResult {
  return {
    categories: orderedKeys,
    Digital:    orderedKeys.map(k => dCounts[k] ?? 0),
    physical:   orderedKeys.map(k => pCounts[k] ?? 0),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Weekly window helpers — computed from today once per cache build.
// ────────────────────────────────────────────────────────────────────────────
function windows() {
  const n = new Date();
  const y = n.getFullYear();
  const m = n.getMonth() + 1;
  const d = n.getDate();
  const startOfMonth = { year: y, month: m, day: 1 };
  const jsDow = (Math.floor(n.getTime() / 86_400_000) + 4) % 7; // 0=Sun
  const startOfWeekDay = Math.max(1, d - jsDow);
  const startOfWeek = { year: jsDow >= d && m === 1 ? y - 1 : y, month: jsDow >= d && d === 1 ? (m === 1 ? 12 : m - 1) : m, day: startOfWeekDay };

  const gte = (a: {year:number;month:number;day:number}, b: {year:number;month:number;day:number}) =>
    a.year > b.year || (a.year === b.year && (a.month > b.month || (a.month === b.month && a.day >= b.day)));

  return { startOfMonth, startOfWeek, gte };
}

// ────────────────────────────────────────────────────────────────────────────
// Core: build everything in one single scan over digital + physical arrays.
// ────────────────────────────────────────────────────────────────────────────
function buildDashboardData(digitalRows: Lead[], physicalRows: PhysicalAttractionLead[]): DashboardData {
  const { startOfMonth, startOfWeek, gte } = windows();

  // Counters
  const stats: DashboardStats = {
    totalLeads: digitalRows.length,
    successfulAccounts: 0, existingAccounts: 0,
    totalUniversities: 0,
    volunteeringCount: 0, professionalCount: 0, teachingCount: 0,
    leadsThisWeek: 0, leadsThisMonth: 0,
    totalPhysicalLeads: physicalRows.length,
    recentLeads: [],
    leadsByMonth: {},
    referralSources: {},
  };

  const monthSet  = new Set<string>();
  const weekSet   = new Set<string>();
  const daySet    = new Set<string>();
  const dMonth: Record<string, number> = {};
  const dWeek:  Record<string, number> = {};
  const dDay:   Record<string, number> = {};
  const pMonth: Record<string, number> = {};
  const pWeek:  Record<string, number> = {};
  const pDay:   Record<string, number> = {};
  const shortMonthOrder: { key: string; label: string; y: number; mo: number }[] = [];
  const shortMonthSeen = new Set<string>();

  const univTotals = new Map<string, { Digital: number; physical: number }>();
  const univStats  = new Map<string, UniversityStatsRow>();
  const universitySet = new Set<string>();
  const incUniv = (name: string) => {
    if (name) universitySet.add(name);
    const bucket = name || "Unknown";
    if (!univStats.has(bucket)) {
      univStats.set(bucket, { name: bucket, totalLeads: 0, volunteering: 0, professional: 0, teaching: 0, successfulAccounts: 0 });
    }
    if (!univTotals.has(bucket)) univTotals.set(bucket, { Digital: 0, physical: 0 });
  };

  // ── Scan digital ────────────────────────────────────────────────────────
  for (const l of digitalRows) {
    // KPI flags
    const status = l.accountStatus;
    if (status.includes("✅")) stats.successfulAccounts++;
    if (status.includes("⚠️")) stats.existingAccounts++;
    if (l.volunteering) stats.volunteeringCount++;
    if (l.professional) stats.professionalCount++;
    if (l.teaching)     stats.teachingCount++;
    if (l.referral) stats.referralSources[l.referral] = (stats.referralSources[l.referral] ?? 0) + 1;

    incUniv(l.university);
    const ut = univTotals.get(l.university || "Unknown")!; ut.Digital++;
    const us = univStats.get(l.university || "Unknown")!;
    us.totalLeads++;
    if (l.volunteering) us.volunteering++;
    if (l.professional) us.professional++;
    if (l.teaching)     us.teaching++;
    if (status.includes("✅")) us.successfulAccounts++;

    // Date keying — regex based, one pass.
    const k = dateKeys(l.submittedAt);
    monthSet.add(k.month); weekSet.add(k.week); daySet.add(k.day);
    dMonth[k.month] = (dMonth[k.month] ?? 0) + 1;
    dWeek [k.week]  = (dWeek [k.week]  ?? 0) + 1;
    dDay  [k.day]   = (dDay  [k.day]   ?? 0) + 1;

    if (k.year) {
      const dt = { year: k.year, month: k.monthNum, day: k.dayNum };
      // leadsByMonth uses the short label (e.g. "Feb 26"), original contract
      if (!shortMonthSeen.has(k.month)) {
        shortMonthSeen.add(k.month);
        shortMonthOrder.push({ key: k.month, label: k.shortMonth, y: k.year, mo: k.monthNum });
      }
      stats.leadsByMonth[k.shortMonth] = (stats.leadsByMonth[k.shortMonth] ?? 0) + 1;
      if (gte(dt, startOfWeek))  stats.leadsThisWeek++;
      if (gte(dt, startOfMonth)) stats.leadsThisMonth++;
    }
  }

  // ── Scan physical ───────────────────────────────────────────────────────
  for (const l of physicalRows) {
    incUniv(l.university);
    const ut = univTotals.get(l.university || "Unknown")!; ut.physical++;
    const us = univStats.get(l.university || "Unknown")!;
    us.totalLeads++;
    if (l.accountStatus.includes("✅")) us.successfulAccounts++;

    const k = dateKeys(l.submittedAt);
    monthSet.add(k.month); weekSet.add(k.week); daySet.add(k.day);
    pMonth[k.month] = (pMonth[k.month] ?? 0) + 1;
    pWeek [k.week]  = (pWeek [k.week]  ?? 0) + 1;
    pDay  [k.day]   = (pDay  [k.day]   ?? 0) + 1;
  }

  stats.totalUniversities = universitySet.size;
  stats.recentLeads       = digitalRows.slice(-10).reverse();

  // Build ordered keys
  const months = [...monthSet].sort();
  const weeks  = [...weekSet].sort();
  const days   = [...daySet].sort().slice(-30);
  // leadsByMonth order should match chronological months (not insertion order)
  shortMonthOrder.sort((a, b) => a.y - b.y || a.mo - b.mo);
  const orderedLeadsByMonth: Record<string, number> = {};
  for (const sm of shortMonthOrder) orderedLeadsByMonth[sm.label] = stats.leadsByMonth[sm.label] ?? 0;
  stats.leadsByMonth = orderedLeadsByMonth;

  const monthly = makeSeries(months, dMonth, pMonth);
  const weekly  = makeSeries(weeks.slice(-12), dWeek, pWeek);
  const daily   = makeSeries(days,   dDay,  pDay);

  // Top universities (top 10 by total)
  const topUniversities: TopUniversityRow[] = [...univTotals.entries()]
    .map(([name, c]) => ({
      name,
      shortName: name.includes(":") ? name.split(":")[0].trim() : name,
      total: c.Digital + c.physical,
      Digital: c.Digital,
      physical: c.physical,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const universityStats: UniversityStatsRow[] = [...univStats.values()]
    .sort((a, b) => b.totalLeads - a.totalLeads);

  return {
    digital: digitalRows,
    physical: physicalRows,
    stats,
    monthly, weekly, daily,
    topUniversities,
    universityStats,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// The single cached entry every page should consume
// ────────────────────────────────────────────────────────────────────────────
const EMPTY: DashboardData = {
  digital: [], physical: [],
  stats: {
    totalLeads: 0, successfulAccounts: 0, existingAccounts: 0, totalUniversities: 0,
    volunteeringCount: 0, professionalCount: 0, teachingCount: 0,
    leadsThisWeek: 0, leadsThisMonth: 0, totalPhysicalLeads: 0,
    recentLeads: [], leadsByMonth: {}, referralSources: {},
  },
  monthly: { categories: [], Digital: [], physical: [] },
  weekly:  { categories: [], Digital: [], physical: [] },
  daily:   { categories: [], Digital: [], physical: [] },
  topUniversities: [],
  universityStats: [],
};

async function computeAll(): Promise<DashboardData> {
  const [dRaw, pRaw] = await Promise.all([fetchDigitalLeadsRaw(), fetchPhysicalLeadsRaw()]);
  return buildDashboardData(dRaw.map(mapDigitalRow), pRaw.map(mapPhysicalRow));
}

const cachedAll = unstable_cache(
  computeAll,
  ["dashboard-all"],
  { tags: ["google-sheets-data", "leads-digital", "leads-physical"], revalidate: 300 }
);

/**
 * Call this directly from server pages — single round trip, single computation.
 */
export async function getAllDashboardData(): Promise<DashboardData> {
  try {
    return await cachedAll();
  } catch (err) {
    console.error("[getAllDashboardData] falling back to empty dataset:", err);
    return EMPTY;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Backward-compat named exports (other pages use these — keep working, cheap)
// ────────────────────────────────────────────────────────────────────────────
export async function getDigitalLeads()                 { return (await getAllDashboardData()).digital; }
export async function getPhysicalAttractionLeads()      { return (await getAllDashboardData()).physical; }
export async function getDashboardStats()               { return (await getAllDashboardData()).stats; }
export async function getLeadSeriesMonthly()            { return (await getAllDashboardData()).monthly; }
export async function getLeadSeriesWeekly()             { return (await getAllDashboardData()).weekly; }
export async function getLeadSeriesDaily()              { return (await getAllDashboardData()).daily; }
export async function getTopUniversities(n = 10)        { return (await getAllDashboardData()).topUniversities.slice(0, n); }
export async function getUniversityStats()              { return (await getAllDashboardData()).universityStats; }
