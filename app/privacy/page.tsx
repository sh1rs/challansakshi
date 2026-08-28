import type { Metadata } from 'next';
import { PrivacyPage } from '../../components/public-beta/PublicInfoPage';

export const metadata: Metadata = { title: 'Privacy & Data Controls — ChallanSakshi', description: 'How local record preview, tab-memory answers, infrastructure request metadata, device copies, and clear controls work.' };
export default function Page() { return <PrivacyPage />; }
