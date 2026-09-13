import { publicPageMetadata } from '../../lib/site-seo';
import { SafetyPage } from '../../components/public-beta/PublicInfoPage';

export const metadata = publicPageMetadata('/safety');
export default function Page() { return <SafetyPage />; }
