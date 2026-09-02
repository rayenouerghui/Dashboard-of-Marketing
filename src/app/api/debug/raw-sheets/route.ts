import "server-only";
import { NextResponse } from 'next/server';
import { fetchDigitalLeadsRaw, fetchPhysicalLeadsRaw } from '@/lib/googleSheetsServer';

// TEMPORARY DEBUG ROUTE — delete after diagnosing the blank-fields issue.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const [digital, physical] = await Promise.all([
      fetchDigitalLeadsRaw(),
      fetchPhysicalLeadsRaw(),
    ]);

    return NextResponse.json({
      envVarsSet: {
        GOOGLE_SHEET_ID: !!process.env.GOOGLE_SHEET_ID,
        GOOGLE_SHEETS_CLIENT_EMAIL: !!process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        GOOGLE_SHEETS_PRIVATE_KEY: !!process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      },
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
      { error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}