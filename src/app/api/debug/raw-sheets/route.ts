import "server-only";
import { NextResponse } from 'next/server';
import { fetchDigitalLeadsRaw, fetchPhysicalLeadsRaw, getGoogleSheetsDebugInfo } from '@/lib/googleSheetsServer';
import { debugComputeAllDashboardData } from '@/lib/dataUtilsServer';

// TEMPORARY DEBUG ROUTE — delete after diagnosing the blank-fields issue.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const diagnostics = await getGoogleSheetsDebugInfo();
    const [digitalResult, physicalResult, processedResult] = await Promise.allSettled([
      fetchDigitalLeadsRaw(),
      fetchPhysicalLeadsRaw(),
      debugComputeAllDashboardData(),
    ]);

    const digital = digitalResult.status === 'fulfilled' ? digitalResult.value : [];
    const physical = physicalResult.status === 'fulfilled' ? physicalResult.value : [];
    const processed = processedResult.status === 'fulfilled' ? processedResult.value : null;

    return NextResponse.json({
      diagnostics,
      digital: {
        count: digital.length,
        firstRowKeys: digital[0] ? Object.keys(digital[0]) : [],
        firstRow: digital[0] ?? null,
        error: digitalResult.status === 'rejected' ? String(digitalResult.reason?.message ?? digitalResult.reason) : null,
      },
      physical: {
        count: physical.length,
        firstRowKeys: physical[0] ? Object.keys(physical[0]) : [],
        firstRow: physical[0] ?? null,
        error: physicalResult.status === 'rejected' ? String(physicalResult.reason?.message ?? physicalResult.reason) : null,
      },
      processed: processed
        ? {
            digitalCount: processed.digital.length,
            physicalCount: processed.physical.length,
            totalLeads: processed.stats.totalLeads,
            successfulAccounts: processed.stats.successfulAccounts,
            existingAccounts: processed.stats.existingAccounts,
            leadsThisWeek: processed.stats.leadsThisWeek,
            leadsThisMonth: processed.stats.leadsThisMonth,
            totalPhysicalLeads: processed.stats.totalPhysicalLeads,
          }
        : null,
      processedError: processedResult.status === 'rejected' ? String(processedResult.reason?.message ?? processedResult.reason) : null,
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