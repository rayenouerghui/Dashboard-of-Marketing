export const dynamic = 'force-dynamic';

import DashboardClient from './DashboardClient';
import { getAllDashboardData, type DashboardData } from '@/lib/dataUtilsServer';

export default async function Page() {
  const data: DashboardData = await getAllDashboardData();
  return (
    <DashboardClient
      initialStats={data.stats}
      initialMonthly={data.monthly}
      initialWeekly={data.weekly}
      initialDaily={data.daily}
      initialUniversities={data.topUniversities}
    />
  );
}
