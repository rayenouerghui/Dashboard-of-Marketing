export const dynamic = 'force-dynamic';

import UniversityDetailsClient from './UniversityDetailsClient';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <UniversityDetailsClient params={params} />;
}