import "server-only";
import { NextResponse } from 'next/server';
import { getPhysicalAttractionLeads } from '@/lib/dataUtilsServer';

export async function GET() {
  try {
    const leads = await getPhysicalAttractionLeads();
    return NextResponse.json(leads);
  } catch (error) {
    console.error('Error fetching physical leads:', error);
    const anyErr = error as any;
    const sheetsStatus = anyErr?.status;
    let httpStatus = 500;
    let message = 'Failed to fetch leads';

    if (typeof sheetsStatus === 'number' && sheetsStatus >= 400) {
      if (sheetsStatus === 403) {
        httpStatus = 502;
        message = 'Google Sheets permission error — the service account is not shared on the sheet (403 caller does not have permission). Open the sheet → Share → paste the service account email as Viewer.';
      } else if (sheetsStatus === 401 || sheetsStatus === 404 || sheetsStatus === 429) {
        httpStatus = 502;
        message = `Google Sheets API error (${sheetsStatus}).`;
      }
    }

    return NextResponse.json(
      { error: message, sheetsStatus: sheetsStatus ?? null, raw: String(anyErr?.message ?? error).slice(0, 400) },
      { status: httpStatus }
    );
  }
}
