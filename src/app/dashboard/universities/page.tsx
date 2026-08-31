export const dynamic = 'force-dynamic';

import UniversitiesClient from './UniversitiesClient';
import { getUniversityStats } from '@/lib/dataUtilsServer';

export default async function Page() {
  let stats: Awaited<ReturnType<typeof getUniversityStats>> = [];
  try {
    stats = await getUniversityStats();
  } catch (err) {
    console.error('[dashboard/universities/page] Failed to load stats:', err);
    stats = [];
  }
  return <UniversitiesClient initialStats={stats} />;
}
