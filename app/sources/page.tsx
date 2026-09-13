import { publicPageMetadata } from '../../lib/site-seo';
import { OfficialSourcesPage } from '../../components/public-beta/OfficialSourcesPage';

export const dynamic = 'force-dynamic';
export const metadata = publicPageMetadata('/sources');

export default function Page() {
  return <OfficialSourcesPage evaluatedAt={new Date().toISOString()} />;
}
