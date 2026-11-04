import { getExpaToken } from './expaTokenSource';

const EXPA_GRAPHQL_URL = 'https://gis-api.aiesec.org/graphql';
const PAGE_SIZE = 50;
const DEFAULT_HOME_LC_ID = Number(process.env.EXPA_HOME_LC_ID ?? 1270);
const GOOD_STATUSES = new Set([
  'open',
  'accepted',
  'approved',
  'approved_ep_manager',
  'matched',
  'realized',
  'completed',
  'finished',
]);
const STATUS_PRIORITY: Record<string, number> = {
  completed: 7,
  finished: 6,
  realized: 5,
  matched: 4,
  approved_ep_manager: 3,
  approved: 3,
  accepted: 2,
  open: 1,
};

export interface ExpaLead {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
  lcName: string;
  bestStatus: string | null;
  programme: string | null;
}

type RawApplication = {
  id?: string | number | null;
  status?: string | null;
  created_at?: string | null;
  person?: {
    id?: string | number | null;
    full_name?: string | null;
    email?: string | null;
    home_lc?: {
      name?: string | null;
    } | null;
  } | null;
  opportunity?: {
    id?: string | number | null;
    title?: string | null;
    programme?: {
      short_name_display?: string | null;
    } | null;
  } | null;
};

function readString(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

function buildHomeLcFilter(): string {
  const homeLcId = Number.isFinite(DEFAULT_HOME_LC_ID) && DEFAULT_HOME_LC_ID > 0 ? DEFAULT_HOME_LC_ID : 1270;
  return `person_home_lc: ${homeLcId}`;
}

export function buildExpaLeadQuery(page: number): string {
  return JSON.stringify({
    query: `{
  allOpportunityApplication(
    filters: {
      ${buildHomeLcFilter()}
      statuses: ["open", "accepted", "approved", "approved_ep_manager", "matched", "realized", "completed", "finished"]
    }
    per_page: ${PAGE_SIZE}
    page: ${page}
  ) {
    paging { total_pages total_items }
    data {
      id
      status
      created_at
      person {
        id
        full_name
        email
        home_lc { name }
      }
      opportunity {
        id
        title
        programme { short_name_display }
      }
    }
  }
}`,
  });
}

function mapApplication(raw: RawApplication): ExpaLead {
  const status = readString(raw.status);
  const person = raw.person ?? null;
  const opportunity = raw.opportunity ?? null;

  return {
    id: readString(raw.id),
    fullName: readString(person?.full_name),
    email: readString(person?.email),
    createdAt: readString(raw.created_at),
    lcName: readString(person?.home_lc?.name),
    bestStatus: GOOD_STATUSES.has(status) ? status : null,
    programme: readString(opportunity?.programme?.short_name_display) || null,
  };
}

async function fetchPage(token: string, page: number): Promise<{ leads: ExpaLead[]; totalPages: number; totalItems: number }> {
  const response = await fetch(`${EXPA_GRAPHQL_URL}?access_token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: buildExpaLeadQuery(page),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`EXPA HTTP ${response.status} fetching lead page ${page}`);
  }

  const json = (await response.json()) as {
    errors?: Array<{ message?: string }>;
    data?: {
      allOpportunityApplication?: {
        paging?: { total_pages?: number; total_items?: number };
        data?: RawApplication[];
      };
    };
  };

  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? 'EXPA GraphQL error');
  }

  const block = json.data?.allOpportunityApplication;
  const totalPages = block?.paging?.total_pages ?? 1;
  const totalItems = block?.paging?.total_items ?? 0;
  const leads = (block?.data ?? []).map(mapApplication);

  return { leads, totalPages, totalItems };
}

export async function fetchAllExpaLeads(): Promise<{ leads: ExpaLead[]; totalItems: number }> {
  const token = getExpaToken();
  if (!token) {
    throw new Error('EXPA API token is not configured.');
  }

  const first = await fetchPage(token, 1);
  const pages = Math.min(first.totalPages, 300);
  const all: ExpaLead[] = [...first.leads];

  const batchSize = 10;
  for (let start = 2; start <= pages; start += batchSize) {
    const end = Math.min(start + batchSize - 1, pages);
    const results = await Promise.all(
      Array.from({ length: end - start + 1 }, (_, index) => fetchPage(token, start + index)),
    );

    for (const result of results) {
      all.push(...result.leads);
    }
  }

  return { leads: all, totalItems: first.totalItems };
}

export function getLeadPriority(status: string | null | undefined): number {
  if (!status) return 0;
  return STATUS_PRIORITY[status] ?? 0;
}
