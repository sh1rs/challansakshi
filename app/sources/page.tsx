import type { Metadata } from 'next';
import { OfficialSourcesPage } from '../../components/public-beta/OfficialSourcesPage';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Official sources & route reviews — ChallanSakshi',
  description: 'See official e-Challan service links, supported jurisdictions, retained review dates, expiry dates and source limitations.',
};

export default function Page() {
  return <OfficialSourcesPage evaluatedAt={new Date().toISOString()} />;
}
