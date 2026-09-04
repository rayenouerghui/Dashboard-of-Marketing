import "server-only";
import { getExpaToken } from "./expaTokenSource";

const EXPA_GRAPHQL_URL = "https://gis-api.aiesec.org/graphql";
const PAGE_SIZE = 50; // max safe per-page for EXPA

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExpaApplication {
  applicationId: string;
  status: string;
  createdAt: string;
  epId: string;
  epName: string;
  epEmail: string;
  epCreatedAt: string;
  opportunityId: string;
  opportunityTitle: string;
  programme: string;
}

interface RawApplication {
  id?: string | number | null;
  status?: string | null;
  created_at?: string | null;
  person?: {
    id?: string | number | null;
    full_name?: string | null;
    email?: string | null;
    created_at?: string | null;
  } | null;
  opportunity?: {
    id?: string | number | null;
    title?: string | null;
    programme?: { short_name_display?: string | null } | null;
  } | null;
}

// Statuses we actively care about — withdrawn and rejected are excluded entirely
// so we never pull their 36 000+ rows from EXPA.
const RELEVANT_STATUSES = [
  "open",
  "accepted",
  "approved",
  "approved_ep_manager",
  "matched",
  "realized",
  "completed",
  "finished",
] as const;

export type RelevantStatus = (typeof RELEVANT_STATUSES)[number];

/** Numeric priority — higher = more advanced in the funnel */
export const STATUS_PRIORITY: Record<string, number> = {
  completed:            7,
  finished:             6,
  realized:             5,
  matched:              4,
  approved_ep_manager:  3,
  approved:             3,
  accepted:             3,
  open:                 1,
};

const APPLICATION_QUERY = `
  query Applications($page: Int!, $perPage: Int!, $from: DateTime, $status: String) {
    allOpportunityApplication(
      per_page: $perPage
      page: $page
      filters: { created_at: { from: $from }, status: $status }
    ) {
      paging {
        total_pages
        current_page
        total_items
      }
      data {
        id
        status
        created_at
        person {
          id
          full_name
          email
          created_at
        }
        opportunity {
          id
          title
          programme { short_name_display }
        }
      }
    }
  }
`;

function toStr(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function mapApplication(raw: RawApplication): ExpaApplication {
  return {
    applicationId:    toStr(raw.id),
    status:           toStr(raw.status),
    createdAt:        toStr(raw.created_at),
    epId:             toStr(raw.person?.id),
    epName:           toStr(raw.person?.full_name),
    epEmail:          toStr(raw.person?.email),
    epCreatedAt:      toStr(raw.person?.created_at),
    opportunityId:    toStr(raw.opportunity?.id),
    opportunityTitle: toStr(raw.opportunity?.title),
    programme:        toStr(raw.opportunity?.programme?.short_name_display),
  };
}

async function fetchPage(
  token: string,
  page: number,
  from: string,
  status: string
): Promise<{ data: ExpaApplication[]; totalPages: number; totalItems: number }> {
  const url = `${EXPA_GRAPHQL_URL}?access_token=${encodeURIComponent(token)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: APPLICATION_QUERY,
      variables: { page, perPage: PAGE_SIZE, from, status },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`EXPA HTTP ${res.status} on applications page ${page}`);
  }

  const json = (await res.json()) as {
    data?: {
      allOpportunityApplication?: {
        paging?: { total_pages?: number; current_page?: number; total_items?: number };
        data?: RawApplication[];
      };
    };
    errors?: Array<{ message?: string }>;
  };

  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? "EXPA GraphQL error");
  }

  const block = json.data?.allOpportunityApplication;
  const totalPages = block?.paging?.total_pages ?? 1;
  const totalItems = block?.paging?.total_items ?? 0;
  const data = (block?.data ?? []).map(mapApplication);

  return { data, totalPages, totalItems };
}

/**
 * Fetch all RELEVANT applications from EXPA (excludes withdrawn + rejected).
 * Deduplicates by EP: if the same person has multiple applications,
 * only the one with the highest-priority status is kept.
 *
 * @param fromDate  ISO date string — how far back to look. Default: this year.
 * @param maxPages  Per-status safety cap (default 200 = up to 10 000 per status).
 */
export async function fetchAllExpaApplications(
  fromDate = "2025-01-01",
  maxPages = 200
): Promise<{ applications: ExpaApplication[]; totalItems: number }> {
  const token = getExpaToken();
  if (!token) throw new Error("EXPA API token is not configured.");

  const allRaw: ExpaApplication[] = [];

  // Fetch each relevant status independently so we never touch withdrawn/rejected
  for (const status of RELEVANT_STATUSES) {
    const first = await fetchPage(token, 1, fromDate, status);
    allRaw.push(...first.data);

    const pages = Math.min(first.totalPages, maxPages);
    if (pages <= 1) continue;

    // Remaining pages in batches of 10 concurrent requests
    const BATCH = 10;
    for (let start = 2; start <= pages; start += BATCH) {
      const end = Math.min(start + BATCH - 1, pages);
      const batch = Array.from({ length: end - start + 1 }, (_, i) =>
        fetchPage(token, start + i, fromDate, status)
      );
      const results = await Promise.all(batch);
      for (const r of results) allRaw.push(...r.data);
    }
  }

  // ── Deduplicate: one entry per EP, keep the best (highest-priority) status ──
  const bestByEp = new Map<string, ExpaApplication>();

  for (const app of allRaw) {
    const key = app.epId || app.epEmail || app.applicationId;
    const existing = bestByEp.get(key);

    if (!existing) {
      bestByEp.set(key, app);
      continue;
    }

    const newPriority = STATUS_PRIORITY[app.status] ?? 0;
    const existingPriority = STATUS_PRIORITY[existing.status] ?? 0;

    if (newPriority > existingPriority) {
      bestByEp.set(key, app);
    }
  }

  const applications = Array.from(bestByEp.values());

  return { applications, totalItems: allRaw.length };
}
