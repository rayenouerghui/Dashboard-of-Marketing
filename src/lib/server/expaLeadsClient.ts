import "server-only";
import { getExpaToken } from "./expaTokenSource";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExpaLead {
  id:          string;
  fullName:    string;
  email:       string;
  createdAt:   string; // ISO — when they signed up
  lcName:      string; // home LC name
  // Best application (highest priority, withdrawn/rejected excluded)
  bestStatus:  string | null;   // "open" | "approved" | "realized" | etc. | null
  programme:   string | null;   // "GTa" | "GTe" | "GV" | null
}

interface RawPerson {
  id:         string | number;
  full_name?: string | null;
  email?:     string | null;
  created_at?: string | null;
  home_lc?:   { name?: string | null } | null;
  opportunity_applications?: {
    nodes?: Array<{
      id?:     string | number | null;
      status?: string | null;
      opportunity?: {
        id?:    string | number | null;
        programme?: { short_name_display?: string | null } | null;
      } | null;
    } | null> | null;
  } | null;
}

const PAGE_SIZE = 50;
const FROM_DATE = "2026-02-01";

// Statuses we keep — withdrawn/rejected ignored
const GOOD_STATUSES = new Set([
  "open","accepted","approved","approved_ep_manager",
  "matched","realized","completed","finished",
]);

const STATUS_PRIORITY: Record<string, number> = {
  completed: 7, finished: 6, realized: 5, matched: 4,
  approved_ep_manager: 3, approved: 3, accepted: 2, open: 1,
};

function toStr(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function buildQuery(page: number, fromDate: string = FROM_DATE): string {
  return JSON.stringify({
    query: `{
  allPeople(
    filters: { registered: { from: "${fromDate}" } }
    per_page: ${PAGE_SIZE}
    page: ${page}
  ) {
    paging { total_pages total_items }
    data {
      id full_name email created_at
      home_lc { name }
      opportunity_applications {
        nodes {
          id status
          opportunity { id programme { short_name_display } }
        }
      }
    }
  }
}`,
  });
}

function mapPerson(raw: RawPerson): ExpaLead {
  const nodes = raw.opportunity_applications?.nodes ?? [];

  let bestStatus: string | null = null;
  let bestPriority = -1;
  let programme: string | null = null;

  for (const node of nodes) {
    if (!node) continue;
    const s = toStr(node.status);
    if (!GOOD_STATUSES.has(s)) continue;
    const pri = STATUS_PRIORITY[s] ?? 0;
    if (pri > bestPriority) {
      bestPriority = pri;
      bestStatus = s;
      programme = toStr(node.opportunity?.programme?.short_name_display) || null;
    }
  }

  return {
    id:        toStr(raw.id),
    fullName:  toStr(raw.full_name),
    email:     toStr(raw.email),
    createdAt: toStr(raw.created_at),
    lcName:    toStr(raw.home_lc?.name),
    bestStatus,
    programme,
  };
}

async function fetchPage(
  token: string,
  page: number,
  fromDate: string = FROM_DATE,
): Promise<{ data: ExpaLead[]; totalPages: number; totalItems: number }> {
  const url = `https://gis-api.aiesec.org/graphql?access_token=${encodeURIComponent(token)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: buildQuery(page, fromDate),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`EXPA HTTP ${res.status} fetching people page ${page}`);

  const json = (await res.json()) as {
    data?: { allPeople?: { paging?: { total_pages?: number; total_items?: number }; data?: RawPerson[] } };
    errors?: Array<{ message?: string }>;
  };

  if (json.errors?.length) throw new Error(json.errors[0]?.message ?? "EXPA GraphQL error");

  const block      = json.data?.allPeople;
  const totalPages = block?.paging?.total_pages  ?? 1;
  const totalItems = block?.paging?.total_items  ?? 0;
  const data       = (block?.data ?? []).map(mapPerson);

  return { data, totalPages, totalItems };
}

/**
 * Fetch ALL people registered since FROM_DATE with their best application status.
 * Pages are fetched concurrently in batches of 10.
 */
export async function fetchAllExpaLeads(fromDate: string = FROM_DATE): Promise<{ leads: ExpaLead[]; totalItems: number }> {
  const token = getExpaToken();
  if (!token) throw new Error("EXPA API token is not configured.");

  const first = await fetchPage(token, 1, fromDate);
  const pages = Math.min(first.totalPages, 300); // safety cap
  const all: ExpaLead[] = [...first.data];

  const BATCH = 10;
  for (let start = 2; start <= pages; start += BATCH) {
    const end     = Math.min(start + BATCH - 1, pages);
    const results = await Promise.all(
      Array.from({ length: end - start + 1 }, (_, i) => fetchPage(token, start + i, fromDate))
    );
    for (const r of results) all.push(...r.data);
  }

  return { leads: all, totalItems: first.totalItems };
}

/**
 * Fetch only recent EPs (last 7 days) for fast dashboard updates.
 * Used for leads count, ranking, and daily goal.
 */
export async function fetchRecentExpaLeads(): Promise<{ leads: ExpaLead[]; totalItems: number }> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fromDate = sevenDaysAgo.toISOString().split('T')[0];
  return fetchAllExpaLeads(fromDate);
}
