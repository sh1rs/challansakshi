import type { Metadata } from 'next';
import MobilityDashboard from '../../components/public-beta/MobilityDashboard';
export const metadata: Metadata = { title: 'Your mobility checklist — ChallanSakshi', description: 'An optional private-device checklist for challan, FASTag and document follow-ups. No account required.' };
export default function DashboardPage() { return <MobilityDashboard />; }
