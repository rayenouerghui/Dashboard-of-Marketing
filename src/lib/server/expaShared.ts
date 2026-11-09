// Shared EXPA primitives used by every EXPA client module.
// Single source of truth for the GraphQL endpoint, status ranking, and the
// retry policy so the client modules can no longer drift apart.

export const EXPA_GRAPHQL_URL = "https://gis-api.aiesec.org/graphql";

/** Status priority — higher = more advanced. */
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

/** Statuses we care about — withdrawn and rejected are ignored. */
export const GOOD_STATUSES = new Set(Object.keys(STATUS_PRIORITY));

// Deliberately NOT in STATUS_PRIORITY: it only affects the conversion funnel,
// where a broken approval still means the EP did apply.
export const BROKEN_APPROVAL_STATUS = "approval_broken";

// Conversion-funnel ranking. Same order as STATUS_PRIORITY, but `approval_broken`
// counts as "applied" (priority 1) instead of being dropped from the funnel.
export const FUNNEL_PRIORITY: Record<string, number> = {
  ...STATUS_PRIORITY,
  [BROKEN_APPROVAL_STATUS]: 1,
};

// EXPA reports a missing person as a top-level GraphQL error rather than an
// empty result, so "record not found" must be told apart from real failures.
export const EXPA_NOT_FOUND = /record not found/i;

// Retry only on rate-limit / server errors — backoff ~2s, 4s, 8s.
const RETRY_DELAYS_MS = [2000, 4000, 8000];

export class ExpaHttpError extends Error {
  status: number;
  constructor(status: number) {
    super(`EXPA HTTP ${status}`);
    this.name = "ExpaHttpError";
    this.status = status;
  }
}

function isRetriable(err: unknown): boolean {
  return err instanceof ExpaHttpError && (err.status === 429 || err.status >= 500);
}

/** Run an EXPA request with bounded retry/backoff on 429 and 5xx. */
export async function withExpaRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetriable(err) || attempt === RETRY_DELAYS_MS.length) break;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }

  throw lastError;
}
