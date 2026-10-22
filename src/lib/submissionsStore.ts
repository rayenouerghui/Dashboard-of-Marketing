/**
 * submissionsStore.ts
 * Store for opportunity fill submissions with Supabase as the source of truth.
 * Data is cached in memory for fast access and loaded from Supabase on startup.
 */

import { getSupabaseClient, hasSupabaseConfig } from "./supabase";

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

// Initialize store from Supabase
let initialized = false;
async function initializeStore() {
  if (initialized) return;
  initialized = true;
  
  if (!hasSupabaseConfig()) {
    console.warn("[submissionsStore] Supabase not configured, starting empty");
    store.set("OGV", []);
    store.set("OGT", []);
    return;
  }
  
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn("[submissionsStore] Supabase client not available, starting empty");
     store.set("OGV", []);
      store.set("OGT", []);
      return;
    }

    const { data: ogvData, error: ogvError } = await supabase
      .from("submissions")
      .select("*")
      .eq("sheet", "OGV")
      .order("submitted_at", { ascending: false });
    
    const { data: ogtData, error: ogtError } = await supabase
      .from("submissions")
      .select("*")
      .eq("sheet", "OGT")
      .order("submitted_at", { ascending: false });

    if (ogvError) console.error("[submissionsStore] Failed to load OGV:", ogvError);
    if (ogtError) console.error("[submissionsStore] Failed to load OGT:", ogtError);

    const ogvSubmissions = (ogvData ?? []).map(fromSupabaseRow);
    const ogtSubmissions = (ogtData ?? []).map(fromSupabaseRow);
    
    store.set("OGV", ogvSubmissions);
    store.set("OGT", ogtSubmissions);
  } catch (error) {
    console.error("[submissionsStore] Failed to load from Supabase, starting empty:", error);
    store.set("OGV", []);
    store.set("OGT", []);
  }
}

function fromSupabaseRow(row: any): SubmissionRecord {
  return {
    id: row.id,
    submittedAt: row.submitted_at,
    sheet: row.sheet,
    product: row.product,
    opportunityId: row.opportunity_id,
    opportunityTitle: row.opportunity_title,
    universityId: row.university_id,
    universityName: row.university_name,
    country: row.country,
    duration: row.duration,
    opportunityDate: row.opportunity_date,
    epName: row.ep_name,
    condition: row.condition,
    note: row.note,
    source: row.source,
  };
}

function toSupabaseRow(record: SubmissionRecord): any {
  return {
    id: record.id,
    submitted_at: record.submittedAt,
    sheet: record.sheet,
    product: record.product,
    opportunity_id: record.opportunityId,
    opportunity_title: record.opportunityTitle,
    university_id: record.universityId,
    university_name: record.universityName,
    country: record.country,
    duration: record.duration,
    opportunity_date: record.opportunityDate,
    ep_name: record.epName,
    condition: record.condition,
    note: record.note,
    source: record.source,
  };
}

export async function addSubmission(record: Omit<SubmissionRecord, "id" | "submittedAt">) {
  // Initialize store if not already done
  await initializeStore();
  
  const entry: SubmissionRecord = {
    ...record,
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    submittedAt: new Date().toISOString(),
  };
  
  // Save to Supabase
  if (hasSupabaseConfig()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from("submissions")
          .insert(toSupabaseRow(entry));
        
        if (error) {
          console.error("[submissionsStore] Failed to save to Supabase:", error);
        }
      } catch (error) {
        console.error("[submissionsStore] Failed to save to Supabase:", error);
      }
    }
  }
  
  // Update in-memory cache
  const list = store.get(entry.sheet) ?? [];
  list.unshift(entry); // newest first
  store.set(entry.sheet, list);
  
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

// Force reload from Supabase (useful for manual refresh)
export async function reloadFromSupabase() {
  initialized = false;
  await initializeStore();
}

/** Derive which sheet a product belongs to */
export function productToSheet(product: string): "OGV" | "OGT" {
  const p = product.trim().toUpperCase();
  if (p === "GV" || p === "OGV") return "OGV";
  return "OGT";
}
