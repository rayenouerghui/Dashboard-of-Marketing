export const dynamic = 'force-dynamic';

import DigitalAttractionClient from './DigitalAttractionClient';
import { getDigitalLeads } from '@/lib/dataUtilsServer';

export default async function Page() {
  let leads: Awaited<ReturnType<typeof getDigitalLeads>> = [];
  try {
    leads = await getDigitalLeads();
  } catch (err) {
    console.error('[dashboard/digital-attraction/page] Failed to load leads:', err);
    leads = [];
  }
  return <DigitalAttractionClient initialLeads={leads} />;
}
