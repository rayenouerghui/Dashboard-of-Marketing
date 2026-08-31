export const dynamic = 'force-dynamic';

import TimelineClient from './TimelineClient';
import { getPhysicalAttractionLeads } from '@/lib/dataUtilsServer';

export default async function Page() {
  let leads: Awaited<ReturnType<typeof getPhysicalAttractionLeads>> = [];
  try {
    leads = await getPhysicalAttractionLeads();
  } catch (err) {
    console.error('[member-dashboard/timeline/page] Failed to load leads:', err);
    leads = [];
  }
  return <TimelineClient initialLeads={leads} />;
}
