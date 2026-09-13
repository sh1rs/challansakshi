import { createPageMetadata } from '../../lib/site-seo';
import MobilityDashboard from '../../components/public-beta/MobilityDashboard';
export const metadata = createPageMetadata('/dashboard', {
  title: 'Your mobility checklist — ChallanSakshi',
  description: 'Your optional private-device checklist for challan, FASTag and document follow-ups.',
  index: false,
});
export default function DashboardPage() { return <MobilityDashboard />; }
