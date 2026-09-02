/**
 * dataUtils.ts — static data access layer for universities and opportunities
 *
 * This file contains only static JSON data accessors and helper functions.
 * For Google Sheets data (leads), use dataUtilsServer.ts instead.
 */

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
  product?:     string;
  benefits:     string[];
  requirements: string[];
}

// ─── 2. Raw data accessors (static JSON only) ────────────────────────────────

export const getUniversities          = (): University[]             => universitiesRaw  as University[];
export const getOpportunities         = (): Opportunity[]            => opportunitiesRaw as Opportunity[];

// ─── 3. University / Opportunity helpers ──────────────────────────────────────

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

