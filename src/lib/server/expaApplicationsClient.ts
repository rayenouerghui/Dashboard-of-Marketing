import "server-only";
import { getExpaToken } from "./expaTokenSource";

const EXPA_GRAPHQL_URL = "https://gis-api.aiesec.org/graphql";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExpaApplication {
  applicationId: string;
  status:         string;
  createdAt:      string;
  epId:           string;
  epName:         string;
  epEmail:        string;
  opportunityId:    string;
  opportunityTitle: string;
  programme:        string;
  // Enriched from our sheet data
  sheetFirstName?:  string;
  sheetLastName?:   string;
  sheetUniversity?: string;
  sheetMemberName?: string;
  sheetSource?:     "digital" | "physical";
}

/** Status priority — higher = more advanced */
export const STATUS_PRIORITY: Record<string, number> = {
  completed:           7,
  finished:            6,
  realized:            5,
  matched:             4,
  approved_ep_manager: 3,
  approved:            3,
  accepted:            2,
  open:                1,
};

// Statuses we care about — withdrawn and rejected are ignored
const GOOD_STATUSES = new Set(Object.keys(STATUS_PRIORITY));

// ─── Batched person lookup ────────────────────────────────────────────────────
// We batch up to BATCH_SIZE person IDs per GraphQL request using aliases.
// EXPA accepts multiple aliased fields in one query body.
const BATCH_SIZE = 20;

interface RawApp {
  id?:     string | number | null;
  status?: string | null;
  created_at?: string | null;
  opportunity?: {
    id?:    string | number | null;
    title?: string | null;
    programme?: { short_name_display?: string | null } | null;
  } | null;
}

function toStr(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

/**
 * Build a batched GraphQL query that fetches all applications for multiple
 * person IDs in a single HTTP round-trip using field aliases.
 */
function buildBatchQuery(personIds: string[]): string {
  const fields = personIds
    .map(
      (id, i) => `
  p${i}: allOpportunityApplication(
    filters: { person_id: ${Number(id)} }
    per_page: 50
    page: 1
  ) {
    data {
      id
      status
      created_at
      opportunity {
        id
        title
        programme { short_name_display }
      }
    }
  }`
    )
    .join("\n");

  return `{ ${fields} }`;
}

/** Pick the best application for a person (highest priority, skip rejected/withdrawn) */
function bestApplication(apps: RawApp[]): RawApp | null {
  let best: RawApp | null = null;
  let bestPri = -1;

  for (const app of apps) {
    const s = toStr(app.status);
    if (!GOOD_STATUSES.has(s)) continue;
    const pri = STATUS_PRIORITY[s] ?? 0;
    if (pri > bestPri) {
      best = app;
      bestPri = pri;
    }
  }

  return best;
}

/**
 * Fetch EXPA application status for a batch of person IDs.
 * Returns a map: personId → best ExpaApplication (or null if no relevant apps).
 */
async function fetchBatch(
  token: string,
  batch: Array<{ personId: string; meta: { epName: string; epEmail: string; sheetFirstName?: string; sheetLastName?: string; sheetUniversity?: string; sheetMemberName?: string; sheetSource?: "digital" | "physical" } }>
): Promise<ExpaApplication[]> {
  const url = `${EXPA_GRAPHQL_URL}?access_token=${encodeURIComponent(token)}`;
  const ids  = batch.map((b) => b.personId);

  const res = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ query: buildBatchQuery(ids) }),
    cache:   "no-store",
  });

  if (!res.ok) throw new Error(`EXPA HTTP ${res.status}`);

  const json = (await res.json()) as {
    data?:   Record<string, { data?: RawApp[] }>;
    errors?: Array<{ message?: string }>;
  };

  if (json.errors?.length) {
    // Non-fatal — some person IDs might not exist; log and continue
    console.warn("[expaApplicationsClient] batch GraphQL warnings:", json.errors.map((e) => e.message).join(", "));
  }

  const results: ExpaApplication[] = [];

  batch.forEach((item, i) => {
    const alias = `p${i}`;
    const apps  = json.data?.[alias]?.data ?? [];
    const best  = bestApplication(apps);
    if (!best) return; // no relevant applications for this person

    results.push({
      applicationId:    toStr(best.id),
      status:           toStr(best.status),
      createdAt:        toStr(best.created_at),
      epId:             item.personId,
      epName:           item.meta.epName,
      epEmail:          item.meta.epEmail,
      opportunityId:    toStr(best.opportunity?.id),
      opportunityTitle: toStr(best.opportunity?.title),
      programme:        toStr(best.opportunity?.programme?.short_name_display),
      sheetFirstName:   item.meta.sheetFirstName,
      sheetLastName:    item.meta.sheetLastName,
      sheetUniversity:  item.meta.sheetUniversity,
      sheetMemberName:  item.meta.sheetMemberName,
      sheetSource:      item.meta.sheetSource,
    });
  });

  return results;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface LeadInput {
  expaId:      string;
  firstName:   string;
  lastName:    string;
  email:       string;
  university:  string;
  memberName?: string;
  source:      "digital" | "physical";
}

/**
 * Given a list of leads from our sheets, look up each person's best EXPA
 * application status in batched GraphQL requests.
 *
 * - Skips leads with no expaId
 * - Deduplicates by expaId before querying (one person = one request)
 * - Ignores withdrawn / rejected applications
 * - Returns only EPs who have at least one relevant application
 */
export async function fetchApplicationsForLeads(
  leads: LeadInput[]
): Promise<{ applications: ExpaApplication[]; skipped: number }> {
  const token = getExpaToken();
  if (!token) throw new Error("EXPA API token is not configured.");

  // Deduplicate leads by expaId — keep first occurrence
  const seen  = new Map<string, LeadInput>();
  let skipped = 0;

  for (const lead of leads) {
    const id = lead.expaId?.trim();
    if (!id || !/^\d+$/.test(id)) { skipped++; continue; }
    if (!seen.has(id)) seen.set(id, lead);
  }

  const uniqueLeads = Array.from(seen.entries()).map(([id, lead]) => ({
    personId: id,
    meta: {
      epName:          `${lead.firstName} ${lead.lastName}`.trim(),
      epEmail:         lead.email,
      sheetFirstName:  lead.firstName,
      sheetLastName:   lead.lastName,
      sheetUniversity: lead.university,
      sheetMemberName: lead.memberName,
      sheetSource:     lead.source,
    },
  }));

  if (uniqueLeads.length === 0) return { applications: [], skipped };

  // Split into BATCH_SIZE chunks, run chunks in parallel groups of 10
  const chunks: typeof uniqueLeads[] = [];
  for (let i = 0; i < uniqueLeads.length; i += BATCH_SIZE) {
    chunks.push(uniqueLeads.slice(i, i + BATCH_SIZE));
  }

  const CONCURRENCY = 10;
  const all: ExpaApplication[] = [];

  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const group   = chunks.slice(i, i + CONCURRENCY);
    const results = await Promise.all(group.map((chunk) => fetchBatch(token, chunk)));
    for (const r of results) all.push(...r);
  }

  return { applications: all, skipped };
}
