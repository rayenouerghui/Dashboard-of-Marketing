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
  approved_tn_manager: 3,
  approved:            3,
  accepted:            2,
  open:                1,
};

// Statuses we care about — withdrawn and rejected are ignored
const GOOD_STATUSES = new Set(Object.keys(STATUS_PRIORITY));

// Deliberately NOT in STATUS_PRIORITY, but counted so the drop stays visible
// instead of silently disappearing (it matches a non-trivial share of apps).
const BROKEN_APPROVAL_STATUS = "approval_broken";

// ─── Batched person lookup ────────────────────────────────────────────────────
// We batch up to BATCH_SIZE person IDs per GraphQL request using aliases.
// EXPA accepts multiple aliased fields in one query body.
const BATCH_SIZE = 20;

// EXPA reports a missing person as a top-level GraphQL error rather than an
// empty result, so "record not found" must be told apart from real failures.
const NOT_FOUND = /record not found/i;

// Retry only on rate-limit / server errors — backoff ~2s, 4s, 8s.
const RETRY_DELAYS_MS = [2000, 4000, 8000];

class ExpaHttpError extends Error {
  status: number;
  constructor(status: number) {
    super(`EXPA HTTP ${status}`);
    this.name = "ExpaHttpError";
    this.status = status;
  }
}

interface BatchInput {
  personId: string;
  meta: {
    epName:           string;
    epEmail:          string;
    sheetFirstName?:  string;
    sheetLastName?:   string;
    sheetUniversity?: string;
    sheetMemberName?: string;
    sheetSource?:     "digital" | "physical";
  };
}

interface BatchOutcome {
  applications: ExpaApplication[];
  notFound:     string[];
  brokenApprovals: number;
}

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

/**
 * Pick the best application for a person (highest priority, skip
 * rejected/withdrawn) and count how many were dropped as broken approvals.
 */
function bestApplication(apps: RawApp[]): { best: RawApp | null; brokenApprovals: number } {
  let best: RawApp | null = null;
  let bestPri = -1;
  let brokenApprovals = 0;

  for (const app of apps) {
    const s = toStr(app.status);
    if (s === BROKEN_APPROVAL_STATUS) brokenApprovals++;
    if (!GOOD_STATUSES.has(s)) continue;
    const pri = STATUS_PRIORITY[s] ?? 0;
    if (pri > bestPri) {
      best = app;
      bestPri = pri;
    }
  }

  return { best, brokenApprovals };
}

/**
 * Fetch EXPA application status for a batch of person IDs.
 * Returns the best application per person plus the person IDs EXPA reported as
 * non-existent — those are kept apart from people who genuinely have no apps.
 */
async function fetchBatch(token: string, batch: BatchInput[]): Promise<BatchOutcome> {
  const url = `${EXPA_GRAPHQL_URL}?access_token=${encodeURIComponent(token)}`;
  const ids  = batch.map((b) => b.personId);

  const res = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ query: buildBatchQuery(ids) }),
    cache:   "no-store",
  });

  if (!res.ok) throw new ExpaHttpError(res.status);

  const json = (await res.json()) as {
    data?:   Record<string, { data?: RawApp[] } | null>;
    errors?: Array<{ message?: string }>;
  };

  // "Requested record not found." is EXPA's per-alias reply for a person_id that
  // doesn't exist. Anything else is a genuine failure and must not be hidden.
  const hardErrors = (json.errors ?? []).filter((e) => !NOT_FOUND.test(e.message ?? ""));
  if (hardErrors.length) {
    throw new Error("EXPA GraphQL: " + hardErrors.map((e) => e.message).join("; "));
  }
  if (!json.data) throw new Error("EXPA returned no data");

  const applications: ExpaApplication[] = [];
  const notFound:     string[]         = [];
  let   brokenApprovals = 0;

  batch.forEach((item, i) => {
    const node = json.data![`p${i}`];
    if (node == null) { notFound.push(item.personId); return; }  // bad ID
    const { best, brokenApprovals: broken } = bestApplication(node.data ?? []);
    brokenApprovals += broken;
    if (!best) return;                                           // real "no relevant apps"

    applications.push({
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

  return { applications, notFound, brokenApprovals };
}

function isRetriable(err: unknown): boolean {
  return err instanceof ExpaHttpError && (err.status === 429 || err.status >= 500);
}

/** fetchBatch with bounded retry/backoff on 429 and 5xx. */
async function fetchBatchWithRetry(token: string, batch: BatchInput[]): Promise<BatchOutcome> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fetchBatch(token, batch);
    } catch (err) {
      lastError = err;
      if (!isRetriable(err) || attempt === RETRY_DELAYS_MS.length) break;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }

  throw lastError;
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

export interface FetchResult {
  applications: ExpaApplication[];
  skipped: number;            // empty / non-numeric expaId
  notFound: string[];         // EXPA says the person doesn't exist
  failedBatches: number;      // chunks that failed even after retries
  brokenApprovals: number;    // applications dropped (status = approval_broken)
  degraded: boolean;          // every batch failed → figures are unusable
}

/**
 * Given a list of leads from our sheets, look up each person's best EXPA
 * application status in batched GraphQL requests.
 *
 * - Skips leads with no expaId
 * - Deduplicates by expaId before querying (one person = one request)
 * - Ignores withdrawn / rejected applications
 * - Returns only EPs who have at least one relevant application
 * - A failing chunk no longer aborts the whole run (reported via `failedBatches`)
 */
export async function fetchApplicationsForLeads(
  leads: LeadInput[]
): Promise<FetchResult> {
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

  const uniqueLeads: BatchInput[] = Array.from(seen.entries()).map(([id, lead]) => ({
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

  if (uniqueLeads.length === 0) {
    return { applications: [], skipped, notFound: [], failedBatches: 0, brokenApprovals: 0, degraded: false };
  }

  // Split into BATCH_SIZE chunks; run a few in parallel at a time.
  const chunks: BatchInput[][] = [];
  for (let i = 0; i < uniqueLeads.length; i += BATCH_SIZE) {
    chunks.push(uniqueLeads.slice(i, i + BATCH_SIZE));
  }

  const CONCURRENCY = 3;
  const applications: ExpaApplication[] = [];
  const notFound:     string[]         = [];
  let failedBatches    = 0;
  let brokenApprovals  = 0;

  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const group   = chunks.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(group.map((chunk) => fetchBatchWithRetry(token, chunk)));

    for (const outcome of settled) {
      if (outcome.status === "fulfilled") {
        applications.push(...outcome.value.applications);
        notFound.push(...outcome.value.notFound);
        brokenApprovals += outcome.value.brokenApprovals;
      } else {
        failedBatches++;
      }
    }
  }

  // Every batch failed and nothing came back — the figures cannot be trusted.
  const degraded = applications.length === 0 && failedBatches > 0;

  return { applications, skipped, notFound, failedBatches, brokenApprovals, degraded };
}
