import "server-only";

import { revalidateTag } from "next/cache";
import { fetchAllExpaLeads, type ExpaLead } from "./expaLeadsClient";
import { getApplicationsFromSheets, type ApplicationsFromSheets } from "./expaApplicationsFromSheets";
import { getSupabaseAdminClient, getSupabaseClient, formatSupabaseError } from "@/lib/supabase";

const EXPA_REFRESH_TABLE = "expa_sync_state";
const EXPA_SYNC_KEY = "last_successful_refresh";
let inMemoryLastSuccessfulRefresh: string | null = null;

export interface ExpaRefreshResult {
  success: true;
  refreshedAt: string;
  totalLeads: number;
  totalApplications: number;
  leads: ExpaLead[];
  applications: ApplicationsFromSheets;
}

async function readPersistedTimestamp(): Promise<string | null> {
  const admin = getSupabaseAdminClient();
  const client = admin ?? getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from(EXPA_REFRESH_TABLE)
    .select("value, updated_at")
    .eq("key", EXPA_SYNC_KEY)
    .maybeSingle();

  if (error) {
    console.warn("[expa-refresh] Could not read persisted refresh timestamp:", formatSupabaseError(error));
    return null;
  }

  const timestamp = typeof data?.value === "string" ? data.value : data?.updated_at;
  return timestamp ? String(timestamp) : null;
}

async function writePersistedTimestamp(timestamp: string): Promise<void> {
  const admin = getSupabaseAdminClient();
  const client = admin ?? getSupabaseClient();
  if (!client) return;

  const { error } = await client
    .from(EXPA_REFRESH_TABLE)
    .upsert({
      key: EXPA_SYNC_KEY,
      value: timestamp,
      updated_at: timestamp,
    }, { onConflict: "key" });

  if (error) {
    console.warn("[expa-refresh] Could not persist refresh timestamp:", formatSupabaseError(error));
  }
}

export async function getLastSuccessfulExpaRefresh(): Promise<string | null> {
  const persisted = await readPersistedTimestamp();
  return persisted ?? inMemoryLastSuccessfulRefresh;
}

export async function performExpaRefresh(): Promise<ExpaRefreshResult> {
  const { leads, totalItems } = await fetchAllExpaLeads();
  const applications = await getApplicationsFromSheets(true);

  if (applications.degraded) {
    throw new Error("EXPA application synchronization is degraded; refresh timestamp not updated.");
  }

  const refreshedAt = new Date().toISOString();
  inMemoryLastSuccessfulRefresh = refreshedAt;
  await writePersistedTimestamp(refreshedAt);

  revalidateTag("expa-data", "max");
  revalidateTag("expa-leads", "max");
  revalidateTag("expa-applications", "max");

  return {
    success: true,
    refreshedAt,
    totalLeads: totalItems,
    totalApplications: applications.applications.length,
    leads,
    applications,
  };
}
