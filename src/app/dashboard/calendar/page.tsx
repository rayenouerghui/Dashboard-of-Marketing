export const dynamic = 'force-dynamic';

import CalendarPageClient from './CalendarPageClient';
import { getPhysicalAttractionLeads } from '@/lib/dataUtilsServer';

export default async function Page() {
  let leads: Awaited<ReturnType<typeof getPhysicalAttractionLeads>> = [];
  try {
    leads = await getPhysicalAttractionLeads();
  } catch (err) {
    console.error('[dashboard/calendar/page] Failed to load leads:', err);
    leads = [];
  }
  return <CalendarPageClient initialLeads={leads} />;
}
