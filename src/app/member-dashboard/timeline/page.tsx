export const dynamic = 'force-dynamic';

import TimelineClient from './TimelineClient';
import { getPhysicalAttractionLeads, getScheduledAttractions } from '@/lib/dataUtilsServer';

export default async function Page() {
  let leads: Awaited<ReturnType<typeof getPhysicalAttractionLeads>> = [];
  let attractions: any[] = [];
  try {
    leads = await getPhysicalAttractionLeads();
    attractions = await getScheduledAttractions();
  } catch (err) {
    console.error('[member-dashboard/timeline/page] Failed to load data:', err);
  }
  return <TimelineClient initialLeads={leads} initialAttractions={attractions} />;
}
