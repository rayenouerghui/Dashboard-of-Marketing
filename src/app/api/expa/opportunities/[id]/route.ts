import { NextRequest, NextResponse } from "next/server";
import { ExpaClientError, fetchExpaOpportunityRaw } from "@/lib/server/expaClient";
import { mapExpaOpportunityToOpportunity } from "@/lib/server/expaOpportunityMapper";

export const dynamic = "force-dynamic";

function isValidOpportunityId(id: string) {
  return /^\d+$/.test(id.trim());
}

function getTokenDiagnostics() {
  const token = process.env.EXPA_API_TOKEN;

  return {
    tokenConfigured: Boolean(token),
    tokenLength: token ? token.length : 0,
  };
}

function buildDebugInfo(error?: ExpaClientError, expaHttpStatus?: number | null) {
  return {
    tokenConfigured: Boolean(process.env.EXPA_API_TOKEN),
    tokenLength: process.env.EXPA_API_TOKEN ? process.env.EXPA_API_TOKEN.length : 0,
    authMethod: "access_token_query",
    expaHttpStatus: expaHttpStatus ?? error?.status ?? 200,
    graphqlError: error?.graphqlErrorMessage ?? null,
    graphqlErrorCode: error?.graphqlErrorCode ?? null,
  };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const diagnostics = getTokenDiagnostics();

    if (!isValidOpportunityId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid Opportunity ID.", debug: buildDebugInfo(undefined, null), ...diagnostics },
        { status: 400 }
      );
    }

    const rawOpportunity = await fetchExpaOpportunityRaw(id);
    const opportunity = mapExpaOpportunityToOpportunity(rawOpportunity);

    return NextResponse.json(
      { success: true, opportunity, debug: buildDebugInfo(undefined, 200), ...diagnostics },
      { status: 200 }
    );
  } catch (error) {
    const diagnostics = getTokenDiagnostics();

    if (error instanceof ExpaClientError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          debug: buildDebugInfo(error),
          ...diagnostics,
        },
        { status: error.status }
      );
    }

    console.error("[api/expa/opportunities/[id]] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to fetch EXPA opportunity.",
        debug: buildDebugInfo(undefined, 500),
        ...diagnostics,
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json({ success: false, error: "Method not allowed" }, { status: 405 });
}