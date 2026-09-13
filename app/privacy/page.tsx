import { publicPageMetadata } from '../../lib/site-seo';
import { PrivacyPage } from '../../components/public-beta/PublicInfoPage';

export const metadata = publicPageMetadata('/privacy');
export default function Page() { return <PrivacyPage />; }
