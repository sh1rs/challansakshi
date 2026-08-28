import type { Metadata } from 'next';
import { PrivacyPage } from '../../components/public-beta/PublicInfoPage';

export const metadata: Metadata = { title: 'Privacy & Data Controls — ChallanSakshi', description: 'How ChallanSakshi real-mode answers, synthetic demo state, hosting request data, downloads, and clear controls work.' };
export default function Page() { return <PrivacyPage />; }
