import "server-only";
import { NextResponse } from 'next/server';
import { fetchDigitalLeadsRaw, fetchPhysicalLeadsRaw, getGoogleSheetsDebugInfo } from '@/lib/googleSheetsServer';

// TEMPORARY DEBUG ROUTE — delete after diagnosing the blank-fields issue.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const diagnostics = await getGoogleSheetsDebugInfo();
    const [digital, physical] = await Promise.all([
      fetchDigitalLeadsRaw(),
      fetchPhysicalLeadsRaw(),
    ]);

    return NextResponse.json({
      diagnostics,
      digital: {
        count: digital.length,
        firstRowKeys: digital[0] ? Object.keys(digital[0]) : [],
        firstRow: digital[0] ?? null,
      },
      physical: {
        count: physical.length,
        firstRowKeys: physical[0] ? Object.keys(physical[0]) : [],
        firstRow: physical[0] ?? null,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: String(err?.message ?? err),
        diagnostics: await getGoogleSheetsDebugInfo().catch(() => null),
      },
      { status: 500 }
    );
  }
}