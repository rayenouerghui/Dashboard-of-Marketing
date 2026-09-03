import "server-only";

const EXPA_GRAPHQL_URL = "https://gis-api.aiesec.org/graphql";

export class ExpaClientError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 500, code = "EXPA_ERROR") {
    super(message);
    this.name = "ExpaClientError";
    this.status = status;
    this.code = code;
  }
}

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string; extensions?: { code?: string } }>;
};

type RawExpaOpportunity = {
  id: string | number;
  title?: string | null;
  description?: string | null;
  organisation?: { name?: string | null } | null;
  city?: { name?: string | null; country?: string | { name?: string | null } | null } | null;
  location?: string | null;
  work_hours?: string | number | null;
  skills?: Array<{ constant_name?: string | null } | null> | null;
  role_info?: { learning_points?: string[] | string | null } | null;
  specifics_info?: {
    salary?: string | number | null;
    salary_currency?: { name?: string | null } | null;
    expected_work_schedule?: string | null;
  } | null;
  logistics_info?: {
    accommodation_provided?: boolean | null;
    accommodation_covered?: boolean | null;
    accommodation_additional_info?: string | null;
    food_provided?: boolean | null;
    food_covered?: boolean | null;
    transportation_provided?: boolean | null;
    transportation_covered?: boolean | null;
    transportation_additional_info?: string | null;
    computer_provided?: boolean | null;
  } | null;
};

type ExpaOpportunityQueryResponse = {
  opportunity?: RawExpaOpportunity | null;
};

const OPPORTUNITY_QUERY = `
  query Opportunity($id: ID!) {
    opportunity(id: $id) {
      id
      title
      description
      organisation {
        name
      }
      city {
        name
        country
      }
      location
      work_hours
      skills {
        constant_name
      }
      role_info {
        learning_points
      }
      specifics_info {
        salary
        salary_currency {
          name
        }
        expected_work_schedule
      }
      logistics_info {
        accommodation_provided
        accommodation_covered
        accommodation_additional_info
        food_provided
        food_covered
        transportation_provided
        transportation_covered
        transportation_additional_info
        computer_provided
      }
    }
  }
`;

function getStatusCodeFromError(errors: GraphQLResponse<unknown>["errors"]) {
  const code = errors?.[0]?.extensions?.code ?? "";

  if (code === "UNAUTHENTICATED") return 401;
  if (code === "FORBIDDEN") return 403;
  if (code === "RATE_LIMITED") return 429;
  return 500;
}

export async function fetchExpaOpportunityRaw(id: string): Promise<RawExpaOpportunity> {
  const token = process.env.EXPA_API_TOKEN;
  if (!token) {
    throw new ExpaClientError("EXPA API token is not configured.", 500, "MISSING_TOKEN");
  }

  const response = await fetch(EXPA_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query: OPPORTUNITY_QUERY, variables: { id } }),
    cache: "no-store",
  });

  if (response.status === 401) {
    throw new ExpaClientError("EXPA authentication failed.", 401, "UNAUTHENTICATED");
  }
  if (response.status === 403) {
    throw new ExpaClientError("EXPA access forbidden.", 403, "FORBIDDEN");
  }
  if (response.status === 429) {
    throw new ExpaClientError("EXPA rate limit exceeded.", 429, "RATE_LIMITED");
  }

  if (!response.ok) {
    throw new ExpaClientError(`EXPA request failed with status ${response.status}.`, response.status, "HTTP_ERROR");
  }

  let payload: GraphQLResponse<ExpaOpportunityQueryResponse>;
  try {
    payload = (await response.json()) as GraphQLResponse<ExpaOpportunityQueryResponse>;
  } catch {
    throw new ExpaClientError("Malformed EXPA response.", 502, "MALFORMED_RESPONSE");
  }

  if (payload.errors?.length) {
    throw new ExpaClientError(
      payload.errors[0]?.message ?? "GraphQL error from EXPA.",
      getStatusCodeFromError(payload.errors),
      payload.errors[0]?.extensions?.code ?? "GRAPHQL_ERROR"
    );
  }

  const opportunity = payload.data?.opportunity;
  if (!opportunity) {
    throw new ExpaClientError("Opportunity not found.", 404, "NOT_FOUND");
  }

  return opportunity;
}