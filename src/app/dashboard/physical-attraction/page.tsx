export const dynamic = 'force-dynamic';

import PhysicalAttractionClient from './PhysicalAttractionClient';
import { getPhysicalAttractionLeads } from '@/lib/dataUtilsServer';

export default async function Page() {
  let leads: Awaited<ReturnType<typeof getPhysicalAttractionLeads>> = [];
  try {
    leads = await getPhysicalAttractionLeads();
  } catch (err) {
    console.error('[dashboard/physical-attraction/page] Failed to load leads:', err);
    leads = [];
  }
  return <PhysicalAttractionClient initialLeads={leads} />;
}