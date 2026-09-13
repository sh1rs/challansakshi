import { createPageMetadata } from '../../lib/site-seo';
import HelperPage from '../../components/mobility/HelperPage';

export const metadata = { ...createPageMetadata('/helper', { title: 'Trusted helper — ChallanSakshi', description: 'Review one explicitly shared case snapshot and suggest a preparation draft for its owner.', index: false, follow: false }), referrer: 'no-referrer' as const };
export default function Page() { return <HelperPage />; }
