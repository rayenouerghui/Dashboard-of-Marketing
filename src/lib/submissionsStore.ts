/**
 * submissionsStore.ts
 * Store for opportunity fill submissions with Google Sheets as the source of truth.
 * Data is cached in memory for fast access and loaded from Google Sheets on startup.
 */

import { fetchOpportunitySubmissions } from "./googleSheetsServer";

export type SubmissionRecord = {
  id: string;
  submittedAt: string;
  sheet: "OGV" | "OGT";
  product: string;
  opportunityId: string;
  opportunityTitle: string;
  universityId: string;
  universityName: string;
  country: string;
  duration: string;
  opportunityDate: string;
  epName: string;
  condition: string;
  note: string;
  source: string;
};

// Module-level map: sheet → submissions[]
const store: Map<"OGV" | "OGT", SubmissionRecord[]> = new Map([
  ["OGV", []],
  ["OGT", []],
]);

// Initialize store from Google Sheets
let initialized = false;
async function initializeStore() {
  if (initialized) return;
  initialized = true;
  
  try {
    const ogvData = await fetchOpportunitySubmissions("OGV");
    const ogtData = await fetchOpportunitySubmissions("OGT");
    
    store.set("OGV", ogvData);
    store.set("OGT", ogtData);
  } catch (error) {
    console.error("[submissionsStore] Failed to load from Google Sheets, starting empty:", error);
    store.set("OGV", []);
    store.set("OGT", []);
  }
}

export async function addSubmission(record: Omit<SubmissionRecord, "id" | "submittedAt">) {
  // Initialize store if not already done
  await initializeStore();
  
  const entry: SubmissionRecord = {
    ...record,
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    submittedAt: new Date().toISOString(),
  };
  const list = store.get(entry.sheet) ?? [];
  list.unshift(entry); // newest first
  store.set(entry.sheet, list);
  
  // Note: Persistence to Google Sheets happens in the API route via appendOpportunitySubmission
  // This is just the in-memory cache for immediate display
  
  return entry;
}

export async function getSubmissions(sheet: "OGV" | "OGT"): Promise<SubmissionRecord[]> {
  await initializeStore();
  return store.get(sheet) ?? [];
}

export async function getAllSubmissions(): Promise<SubmissionRecord[]> {
  await initializeStore();
  return [...(store.get("OGV") ?? []), ...(store.get("OGT") ?? [])].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

// Force reload from Google Sheets (useful for manual refresh)
export async function reloadFromSheets() {
  initialized = false;
  await initializeStore();
}

/** Derive which sheet a product belongs to */
export function productToSheet(product: string): "OGV" | "OGT" {
  const p = product.trim().toUpperCase();
  if (p === "GV" || p === "OGV") return "OGV";
  return "OGT";
}
